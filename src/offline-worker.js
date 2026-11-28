import { advance, settleOffline } from './sim.js';
import { OFFLINE_CAP } from './data.js';
self.onmessage = ({ data }) => {
  try {
    if (data.mode === 'active-tab') {
      // Background tabs throttle animation callbacks. Catch up the same live
      // simulation on return, including boss combat; this is not offline play.
      const elapsed = Number.isFinite(data.elapsed) ? Math.max(0, data.elapsed) : 0;
      const seconds = Math.min(elapsed, OFFLINE_CAP);
      advance(data.state, seconds, { effects: false });
      self.postMessage({ state: data.state, report: null, activeTab: true, seconds, capped: elapsed > OFFLINE_CAP });
    } else {
      const report = settleOffline(data.state, data.elapsed);
      self.postMessage({ state: data.state, report });
    }
  } catch (error) { self.postMessage({ error: error.message }); }
};
