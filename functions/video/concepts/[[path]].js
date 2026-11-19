// Videos need byte ranges for seeking and iPad Safari; see worker/media-range.js.
import { mediaRange } from '../../../worker/media-range.js';
export const onRequest = ({ request, env }) => mediaRange(request, env.ASSETS);
