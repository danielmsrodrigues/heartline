import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// O Keychain limita cada item a ~2 KB e a sessão do Supabase passa disso,
// por isso o valor é partido em blocos. 600 caracteres cabem mesmo que
// todos ocupem 3 bytes em UTF-8.
const CHUNK_SIZE = 600;
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// Os blocos são escritos numa "geração" (a/b) nova e só depois o ponteiro muda
// para ela. Se a app morrer a meio da escrita, o ponteiro ainda aponta para a
// geração anterior, completa — nunca para uma mistura de blocos novos e antigos.
type Generation = "a" | "b";
interface Pointer {
  generation: Generation;
  count: number;
}

const pointerKey = (key: string) => `${key}.ptr`;
const chunkKey = (key: string, generation: Generation, index: number) =>
  `${key}.${generation}.${index}`;

async function readPointer(key: string): Promise<Pointer | null> {
  const raw = await SecureStore.getItemAsync(pointerKey(key), OPTIONS);
  const match = raw ? /^(a|b):(\d+)$/.exec(raw) : null;
  if (!match) return null;
  return { generation: match[1] as Generation, count: parseInt(match[2], 10) };
}

async function removeChunks(key: string, pointer: Pointer | null): Promise<void> {
  if (!pointer) return;
  for (let i = 0; i < pointer.count; i++) {
    await SecureStore.deleteItemAsync(chunkKey(key, pointer.generation, i), OPTIONS);
  }
}

async function removeSecure(key: string): Promise<void> {
  const pointer = await readPointer(key);
  await SecureStore.deleteItemAsync(pointerKey(key), OPTIONS);
  await removeChunks(key, pointer);
}

async function writeSecure(key: string, value: string): Promise<void> {
  const previous = await readPointer(key);
  const generation: Generation = previous?.generation === "a" ? "b" : "a";
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }
  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(chunkKey(key, generation, i), chunks[i], OPTIONS);
  }
  await SecureStore.setItemAsync(pointerKey(key), `${generation}:${chunks.length}`, OPTIONS);
  await removeChunks(key, previous);
}

async function readSecure(key: string): Promise<string | null> {
  const pointer = await readPointer(key);
  if (!pointer || pointer.count === 0) return null;
  const chunks: string[] = [];
  for (let i = 0; i < pointer.count; i++) {
    const chunk = await SecureStore.getItemAsync(chunkKey(key, pointer.generation, i), OPTIONS);
    if (chunk == null) return null;
    chunks.push(chunk);
  }
  return chunks.join("");
}

// Na renderização estática (web, em Node) não existe `window` nem storage.
const noopStorage = {
  getItem: async (_key: string): Promise<string | null> => null,
  setItem: async (_key: string, _value: string): Promise<void> => {},
  removeItem: async (_key: string): Promise<void> => {},
};

/**
 * Storage da sessão do Supabase no Keychain/Keystore. Sessões guardadas por
 * versões anteriores em AsyncStorage são migradas na primeira leitura.
 */
export const secureSessionStorage =
  Platform.OS === "web"
    ? typeof window === "undefined"
      ? noopStorage
      : AsyncStorage
    : {
        async getItem(key: string): Promise<string | null> {
          const value = await readSecure(key);
          if (value != null) return value;

          const legacy = await AsyncStorage.getItem(key);
          if (legacy != null) {
            await writeSecure(key, legacy);
            await AsyncStorage.removeItem(key);
          }
          return legacy;
        },
        async setItem(key: string, value: string): Promise<void> {
          await writeSecure(key, value);
        },
        async removeItem(key: string): Promise<void> {
          await removeSecure(key);
          await AsyncStorage.removeItem(key);
        },
      };
