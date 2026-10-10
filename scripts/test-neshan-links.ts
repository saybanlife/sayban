import {
  getNeshanPlaceUrl,
  parseCoord
} from "../components/centerPage/neshanLinks";

/**
 * Tiny unit-style checks for Neshan link construction (run via node).
 * Ensures lat/lng are not swapped in the official deep link.
 */
function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const lat = 35.6892;
const lng = 51.389;
const url = getNeshanPlaceUrl(lat, lng);

assert(url.includes(`lat=${lat}`), "lat query missing or wrong");
assert(url.includes(`lng=${lng}`), "lng query missing or wrong");
assert(!url.includes(`lat=${lng}`), "lat/lng appear swapped");
assert(parseCoord("35.6") === 35.6, "parseCoord string");
assert(parseCoord("") === null, "parseCoord empty");
assert(getNeshanPlaceUrl(null, lng) === "", "missing lat → empty");

console.log("neshanLinks ok:", url);
