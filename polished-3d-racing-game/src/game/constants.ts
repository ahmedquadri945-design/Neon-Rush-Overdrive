// Central tuning constants for Neon Rush. All distances are in world units,
// speeds in units/second, times in seconds.

export const LANE_COUNT = 5;
export const LANE_WIDTH = 3.4;
export const ROAD_WIDTH = LANE_COUNT * LANE_WIDTH; // 17
export const ROAD_HALF = ROAD_WIDTH / 2;

// Player / traffic dimensions (used for collision + visuals)
export const CAR_WIDTH = 1.9;
export const CAR_LENGTH = 4.3;

// World / camera
export const FORWARD = -1; // -z is forward (into the screen)
export const CAMERA_OFFSET = { x: 0, y: 5.4, z: 10.2 };
export const LOOK_AHEAD = -26;
export const FOV_BASE = 72;
export const FOV_BOOST = 92;
export const DRAW_DISTANCE = 250;
export const SPAWN_Z = -245; // where pickups / ambient motes appear
export const TRAFFIC_SPAWN_Z = -175; // traffic appears a bit closer for quicker action
export const DESPAWN_Z = 26; // behind the camera -> recycle

// Speed tuning
export const SPEED_START = 70;
export const SPEED_MAX = 165;
export const SPEED_GROWTH = 0.5; // units/sec added per second of survival
export const SPEED_TO_KMH = 3.0; // display scale

// Nitro / boost
export const NITRO_MAX = 100;
export const NITRO_DRAIN = 34; // per second while boosting
export const NITRO_PICKUP = 34;
export const NITRO_PASSIVE = 1.6; // slow trickle regen
export const BOOST_MULT = 1.7;

// Steering
export const LATERAL_MAX = 26; // max lateral speed
export const LATERAL_ACCEL = 130;
export const TOUCH_RESPONSIVENESS = 9; // spring factor for drag steering

// Player can roam a little past the road edge (shoulder) before guardrail stops them
export const X_LIMIT = ROAD_HALF - CAR_WIDTH / 2 + 0.15;

// Health
export const HEALTH_MAX = 100;
export const HEALTH_HIT = 34; // three big hits
export const HEALTH_SCRAPE = 8;
export const INVULN_TIME = 1.4;

// Scoring
export const SCORE_PER_UNIT = 0.6;
export const NEAR_MISS_BASE = 120;
export const PICKUP_SCORE = 60;
export const COMBO_WINDOW = 3.2; // seconds to keep combo alive
export const COMBO_CAP = 20;

// Spawning
export const TRAFFIC_SPAWN_START = 1.15; // seconds between spawn waves
export const TRAFFIC_SPAWN_MIN = 0.42;
export const PICKUP_SPAWN = 2.6;

// Colors (shared with UI theme)
export const COLORS = {
  cyan: 0x22d3ee,
  magenta: 0xff2d95,
  amber: 0xffb020,
  purple: 0x8b5cf6,
  lime: 0xa3e635,
  road: 0x14121f,
  fog: 0x1a1030,
  skyTop: 0x0a0620,
  skyHorizon: 0xff5f6d,
  sun: 0xffcf6b,
};

// Car colors for traffic
export const TRAFFIC_COLORS = [
  0x3b82f6, 0xef4444, 0xf59e0b, 0x10b981, 0xa855f7, 0xe2e8f0, 0x64748b,
];
