import { settleOffline } from './sim.js';
self.onmessage = ({ data }) => {
  try { const report = settleOffline(data.state, data.elapsed); self.postMessage({ state: data.state, report }); }
  catch (error) { self.postMessage({ error: error.message }); }
};
