import { useState, useCallback } from 'react';
import { Platform } from 'react-native';

// Types for health data
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

export function useHealthKit() {
  const [data, setData] = useState<HealthData>(emptyHealth);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const isAvailable = Platform.OS === 'ios';

  const requestAuthorization = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;

    try {
      const Healthkit = await import('@kingstinct/react-native-healthkit');

      const readPermissions = [
        Healthkit.HKQuantityTypeIdentifier.heartRate,
        Healthkit.HKQuantityTypeIdentifier.restingHeartRate,
        Healthkit.HKQuantityTypeIdentifier.stepCount,
        Healthkit.HKQuantityTypeIdentifier.oxygenSaturation,
        Healthkit.HKQuantityTypeIdentifier.bloodPressureSystolic,
        Healthkit.HKQuantityTypeIdentifier.bloodPressureDiastolic,
      ];

      await Healthkit.default.requestAuthorization(readPermissions);
      setAuthorized(true);
      return true;
    } catch (err) {
      console.error('HealthKit authorization error:', err);
      return false;
    }
  }, [isAvailable]);

  const fetchData = useCallback(async () => {
    if (!isAvailable || !authorized) return;

    setLoading(true);
    try {
      const Healthkit = await import('@kingstinct/react-native-healthkit');
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const result: HealthData = { ...emptyHealth, lastUpdated: now };

      // Resting heart rate (last 30 days)
      try {
        const rhr = await Healthkit.default.queryQuantitySamples(
          Healthkit.HKQuantityTypeIdentifier.restingHeartRate,
          { from: thirtyDaysAgo, to: now, limit: 1, ascending: false }
        );
        if (rhr.length > 0) result.restingHeartRate = Math.round(rhr[0].quantity);
      } catch {}

      // Latest heart rate
      try {
        const hr = await Healthkit.default.queryQuantitySamples(
          Healthkit.HKQuantityTypeIdentifier.heartRate,
          { from: sevenDaysAgo, to: now, limit: 1, ascending: false }
        );
        if (hr.length > 0) result.latestHeartRate = Math.round(hr[0].quantity);
      } catch {}

      // Blood pressure (systolic + diastolic)
      try {
        const sys = await Healthkit.default.queryQuantitySamples(
          Healthkit.HKQuantityTypeIdentifier.bloodPressureSystolic,
          { from: thirtyDaysAgo, to: now, limit: 1, ascending: false }
        );
        const dia = await Healthkit.default.queryQuantitySamples(
          Healthkit.HKQuantityTypeIdentifier.bloodPressureDiastolic,
          { from: thirtyDaysAgo, to: now, limit: 1, ascending: false }
        );
        if (sys.length > 0) result.systolic = Math.round(sys[0].quantity);
        if (dia.length > 0) result.diastolic = Math.round(dia[0].quantity);
      } catch {}

      // Steps (average last 7 days)
      try {
        const steps = await Healthkit.default.queryQuantitySamples(
          Healthkit.HKQuantityTypeIdentifier.stepCount,
          { from: sevenDaysAgo, to: now }
        );
        if (steps.length > 0) {
          const total = steps.reduce((sum, s) => sum + s.quantity, 0);
          result.avgDailySteps = Math.round(total / 7);
        }
      } catch {}

      // Oxygen saturation
      try {
        const spo2 = await Healthkit.default.queryQuantitySamples(
          Healthkit.HKQuantityTypeIdentifier.oxygenSaturation,
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
  }, [isAvailable, authorized]);

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
