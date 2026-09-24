import { getCachedHrFactories } from "@/lib/cached-data";
import { AttendanceClient } from "@/components/hr/attendance-client";

export default async function AttendancePage() {
  const factories = await getCachedHrFactories();
  return <AttendanceClient factories={factories} />;
}
