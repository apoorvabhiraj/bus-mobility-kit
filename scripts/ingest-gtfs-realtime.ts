import { gtfsRtIngestionService } from '../packages/backend/src/services/gtfs-rt-ingestion.service';

async function main() {
  const mode = process.argv[2] || 'once'; // 'once' | 'poll'
  console.log('[gtfs-realtime] starting ingestion (mode:', mode, ')');

  if (mode === 'poll') {
    gtfsRtIngestionService.startPolling();
    // Keep process alive while polling
    process.on('SIGINT', () => {
      console.log('\n[gtfs-realtime] stopping...');
      gtfsRtIngestionService.stopPolling();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      gtfsRtIngestionService.stopPolling();
      process.exit(0);
    });
    return;
  }

  // 'once': run a single poll and exit
  const count = await gtfsRtIngestionService.pollOnce();
  console.log(`[gtfs-realtime] done. ingested ${count} vehicle position(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[gtfs-realtime] fatal:', err.message);
  process.exit(1);
});
