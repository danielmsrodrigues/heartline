import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface HealthData {
  restingHeartRate: number | null;
  latestHeartRate: number | null;
  systolic: number | null;
  diastolic: number | null;
  avgDailySteps: number | null;
  oxygenSaturation: number | null;
  lastUpdated: Date | null;
}

const emptyHealth: HealthData = {
  restingHeartRate: null,
  latestHeartRate: null,
  systolic: null,
  diastolic: null,
  avgDailySteps: null,
  oxygenSaturation: null,
  lastUpdated: null,
};

// Expo Go cannot load NitroModules — the module crashes at import time.
// Check execution environment before attempting to require HealthKit.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

let _hk: any = null;
let _hkChecked = false;

function getHK(): any | null {
  if (_hkChecked) return _hk;
  _hkChecked = true;
  if (isExpoGo || Platform.OS !== 'ios') {
    _hk = null;
    return null;
  }
  try {
    const mod = require('@kingstinct/react-native-healthkit');
    _hk = mod.default ?? mod;
    return _hk;
  } catch {
    _hk = null;
    return null;
  }
}

export function useHealthKit() {
  const [data, setData] = useState<HealthData>(emptyHealth);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nativeAvailable, setNativeAvailable] = useState<boolean | null>(null);
  const isIOS = Platform.OS === 'ios';

  useEffect(() => {
    if (!isIOS) { setNativeAvailable(false); return; }
    setNativeAvailable(getHK() != null);
  }, [isIOS]);

  const isAvailable = isIOS && nativeAvailable === true;

  const requestAuthorization = useCallback(async (): Promise<boolean> => {
    const hk = getHK();
    if (!hk) return false;

    try {
      await hk.requestAuthorization({
        toRead: [
          'HKQuantityTypeIdentifierHeartRate',
          'HKQuantityTypeIdentifierRestingHeartRate',
          'HKQuantityTypeIdentifierStepCount',
          'HKQuantityTypeIdentifierOxygenSaturation',
          'HKQuantityTypeIdentifierBloodPressureSystolic',
          'HKQuantityTypeIdentifierBloodPressureDiastolic',
        ],
      });

      setAuthorized(true);
      return true;
    } catch (err) {
      console.error('HealthKit authorization error:', err);
      return false;
    }
  }, []);

  const fetchData = useCallback(async () => {
    const hk = getHK();
    if (!hk || !authorized) return;

    setLoading(true);
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const result: HealthData = { ...emptyHealth, lastUpdated: now };

      try {
        const rhr = await hk.queryQuantitySamples(
          'HKQuantityTypeIdentifierRestingHeartRate',
          { from: thirtyDaysAgo, to: now, limit: 1, ascending: false }
        );
        if (rhr.length > 0) result.restingHeartRate = Math.round(rhr[0].quantity);
      } catch {}

      try {
        const hr = await hk.queryQuantitySamples(
          'HKQuantityTypeIdentifierHeartRate',
          { from: sevenDaysAgo, to: now, limit: 1, ascending: false }
        );
        if (hr.length > 0) result.latestHeartRate = Math.round(hr[0].quantity);
      } catch {}

      try {
        const sys = await hk.queryQuantitySamples(
          'HKQuantityTypeIdentifierBloodPressureSystolic',
          { from: thirtyDaysAgo, to: now, limit: 1, ascending: false }
        );
        const dia = await hk.queryQuantitySamples(
          'HKQuantityTypeIdentifierBloodPressureDiastolic',
          { from: thirtyDaysAgo, to: now, limit: 1, ascending: false }
        );
        if (sys.length > 0) result.systolic = Math.round(sys[0].quantity);
        if (dia.length > 0) result.diastolic = Math.round(dia[0].quantity);
      } catch {}

      try {
        const steps = await hk.queryQuantitySamples(
          'HKQuantityTypeIdentifierStepCount',
          { from: sevenDaysAgo, to: now }
        );
        if (steps.length > 0) {
          const total = steps.reduce((sum, s) => sum + s.quantity, 0);
          result.avgDailySteps = Math.round(total / 7);
        }
      } catch {}

      try {
        const spo2 = await hk.queryQuantitySamples(
          'HKQuantityTypeIdentifierOxygenSaturation',
          { from: thirtyDaysAgo, to: now, limit: 1, ascending: false }
        );
        if (spo2.length > 0) result.oxygenSaturation = Math.round(spo2[0].quantity * 100);
      } catch {}

      setData(result);
    } catch (err) {
      console.error('HealthKit fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [authorized]);

  const connect = useCallback(async () => {
    const granted = await requestAuthorization();
    if (granted) {
      await fetchData();
    }
    return granted;
  }, [requestAuthorization, fetchData]);

  const disconnect = useCallback(() => {
    setAuthorized(false);
    setData(emptyHealth);
  }, []);

  return {
    data,
    authorized,
    loading,
    isAvailable,
    connect,
    disconnect,
    refetch: fetchData,
  };
}
