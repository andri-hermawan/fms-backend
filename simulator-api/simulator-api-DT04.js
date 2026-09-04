/**
 * ============================================================
 * FMS Equipment Log Simulator
 * Scenario Testing
 * ============================================================
 */

const axios = require("axios");

/*==============================================================
= CONFIG
==============================================================*/

const BASE_URL =
  "http://localhost:3346/fms/api/equipment-logs";

const BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFuZHJpLmhlcm1hd2FuQGZtcy5jb20iLCJzdWIiOiIwYjEwNzA1ZS01NDVjLTQ1N2QtODg2Mi01MzM1NjYwMmQ1N2MiLCJyb2xlIjoic3VwZXJhZG1pbiIsImlhdCI6MTc4ODUxNTc5MCwiZXhwIjoxNzg4NjAyMTkwfQ.WTdFwWH2QySJ2LJlv_ei9wrcp829YxJq6g7pYjsY2R8";
// const BEARER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFuZHJpLmhlcm1hd2FuQGZtcy5jb20iLCJzdWIiOiIwYjEwNzA1ZS01NDVjLTQ1N2QtODg2Mi01MzM1NjYwMmQ1N2MiLCJyb2xlIjoic3VwZXJhZG1pbiIsImlhdCI6MTc4NzkwMDQ5MiwiZXhwIjoxNzg3OTg2ODkyfQ.T0nDza1YfBX_opv7fZoOkt1zFX35BPwysRBf-QNpMy8";

const EQUIPMENT_ID = "f070646a-2ff8-416a-bb9f-f5f940ddb4c3";
const DEVICE_ID = "493a17bf-a749-4cc1-90a1-f2da27cfb39d";

// 3 detik
const SEND_INTERVAL = 3000;

// Tanggal hari ini (format yyyy-mm-dd)
const now = new Date();
const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/*==============================================================
= SCENARIO
==============================================================*/

const scenario = [
{
"created_at": "2026-08-28 07:15:00",
"time": "2026-08-28 07:15:00",
"latitude": -3.4700518409,
"longitude": 103.8713217515,
"fuel_level": 1970,
"speed": 0,
"mileage": 0,
"engine_status": false,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:15:30",
"time": "2026-08-28 07:15:30",
"latitude": -3.4711800623,
"longitude": 103.870971128199,
"fuel_level": 1967.242,
"speed": 30,
"mileage": 250,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:16:00",
"time": "2026-08-28 07:16:00",
"latitude": -3.4710997317,
"longitude": 103.868845622199,
"fuel_level": 1964.484,
"speed": 30,
"mileage": 500,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:16:30",
"time": "2026-08-28 07:16:30",
"latitude": -3.4703033683,
"longitude": 103.866341102899,
"fuel_level": 1961.726,
"speed": 30,
"mileage": 750,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:17:00",
"time": "2026-08-28 07:17:00",
"latitude": -3.4692884495,
"longitude": 103.863659291399,
"fuel_level": 1958.968,
"speed": 30,
"mileage": 950,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:17:30",
"time": "2026-08-28 07:17:30",
"latitude": -3.4707250142,
"longitude": 103.862564683,
"fuel_level": 1956.21,
"speed": 30,
"mileage": 1100,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:18:00",
"time": "2026-08-28 07:18:00",
"latitude": -3.4726071804,
"longitude": 103.8627502732,
"fuel_level": 1954.831,
"speed": 0,
"mileage": 1200,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:18:30",
"time": "2026-08-28 07:18:30",
"latitude": -3.4731864498,
"longitude": 103.862693946899,
"fuel_level": 1953.452,
"speed": 30,
"mileage": 1350,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:19:00",
"time": "2026-08-28 07:19:00",
"latitude": -3.4740161595,
"longitude": 103.862828133199,
"fuel_level": 1952.467,
"speed": 0,
"mileage": 1400,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:19:30",
"time": "2026-08-28 07:19:30",
"latitude": -3.4740365263,
"longitude": 103.862848352699,
"fuel_level": 2937.467,
"speed": 0,
"mileage": 1400,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:20:00",
"time": "2026-08-28 07:20:00",
"latitude": -3.4740365032,
"longitude": 103.862829299699,
"fuel_level": 3922.467,
"speed": 0,
"mileage": 1400,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:20:30",
"time": "2026-08-28 07:20:30",
"latitude": -3.4740352893,
"longitude": 103.8628150114,
"fuel_level": 3922.467,
"speed": 0,
"mileage": 1400,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:21:00",
"time": "2026-08-28 07:21:00",
"latitude": -3.4740532557,
"longitude": 103.8628292796,
"fuel_level": 3922.073,
"speed": 0,
"mileage": 1400,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:21:30",
"time": "2026-08-28 07:21:30",
"latitude": -3.4754956635,
"longitude": 103.863019831499,
"fuel_level": 3919.315,
"speed": 30,
"mileage": 1600,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:22:00",
"time": "2026-08-28 07:22:00",
"latitude": -3.4779302132,
"longitude": 103.8640255551,
"fuel_level": 3916.557,
"speed": 30,
"mileage": 1850,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:22:30",
"time": "2026-08-28 07:22:30",
"latitude": -3.4800254145,
"longitude": 103.864967368099,
"fuel_level": 3913.799,
"speed": 30,
"mileage": 2100,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:23:00",
"time": "2026-08-28 07:23:00",
"latitude": -3.4817732767,
"longitude": 103.866164420399,
"fuel_level": 3911.041,
"speed": 30,
"mileage": 2350,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:23:30",
"time": "2026-08-28 07:23:30",
"latitude": -3.4836770818,
"longitude": 103.867624494599,
"fuel_level": 3908.283,
"speed": 30,
"mileage": 2600,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:24:00",
"time": "2026-08-28 07:24:00",
"latitude": -3.4857453785,
"longitude": 103.8683439999,
"fuel_level": 3905.525,
"speed": 30,
"mileage": 2850,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
{
"created_at": "2026-08-28 07:24:30",
"time": "2026-08-28 07:24:30",
"latitude": -3.4873246468,
"longitude": 103.8688686049,
"fuel_level": 3902.767,
"speed": 30,
"mileage": 3100,
"engine_status": true,
"gsm_signal": 1,
"gsm_operator": 51010,
},
];

/*==============================================================
= GLOBAL STATE
==============================================================*/

let packet = 0;
let odometer = 0;
let mileage = 0;

/*==============================================================
= RANDOM
==============================================================*/

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(random(min, max + 1));
}

/*==============================================================
= BODY
==============================================================*/

function buildBody(item) {

  if (packet > 0) {
    odometer += item.speed * (3 / 3.6);
    mileage = odometer;
  }

  return {
    created_at: `${TODAY} ${item.created_at.split(" ")[1]}`,
    time: new Date(`${TODAY} ${item.time.split(" ")[1]}`).toISOString(),

    equipment_id: EQUIPMENT_ID,
    device_id: DEVICE_ID,

    latitude: item.latitude,
    longitude: item.longitude,

    altitude: 0,

    heading:
      item.speed === 0
        ? 0
        : randomInt(170, 190),

    satellites: randomInt(10, 16),

    speed: item.speed,

    accelerometer_x: randomInt(-2, 2),
    accelerometer_y: randomInt(-2, 2),
    accelerometer_z: randomInt(-2, 2),

    odometer: Math.round(odometer),

    engine_status: item.engine_status,

    external_voltage: item.engine_status ? 24.5 : 0,

    internal_battery_voltage: item.engine_status ? 3.9 : 0,

    battery_current: 0,

    gsm_signal: item.gsm_signal,

    gsm_operator: item.gsm_operator,

    pdop: Number(random(0.8, 1.5).toFixed(2)),

    hdop: Number(random(0.8, 1.5).toFixed(2)),

    gnss_status: item.engine_status ? 1 : 0,

    fuel_level: item.fuel_level,

    fuel_temperature:
      item.engine_status
        ? Number(random(29, 34).toFixed(1))
        : 0,

    sleep_mode: item.engine_status ? 0 : 1,

    movement_runtime: packet * 3,

    analog_input_1: 0,

    mileage: Math.round(mileage),

    vessel: 0,
  };
}

/*==============================================================
= SEND
==============================================================*/

async function sendPacket(index) {

  const item = scenario[index];

  const body = buildBody(item);

  packet++;

  console.log(
    `#${packet.toString().padStart(2, "0")} | ` +
    `Engine=${body.engine_status ? "ON " : "OFF"} | ` +
    `Speed=${body.speed.toString().padStart(2)} | ` +
    `Fuel=${body.fuel_level} | ` +
    `Lat=${body.latitude} | ` +
    `Lng=${body.longitude}`
  );

  try {

    const response = await axios.post(
      BASE_URL,
      body,
      {
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    console.log(
      `   SUCCESS ${response.status}`
    );

  }
  catch (err) {

    if (err.response) {

      console.log(
        `   ERROR ${err.response.status}`
      );

      console.log(err.response.data);

    } else {

      console.log(err.message);

    }

  }

}

/*==============================================================
= START SIMULATION
==============================================================*/

let currentIndex = 0;

console.log("===========================================");
console.log("FMS EQUIPMENT LOG SIMULATOR");
console.log("===========================================");
console.log("Equipment :", EQUIPMENT_ID);
console.log("Device    :", DEVICE_ID);
console.log("Scenario  :", scenario.length, "Packet");
console.log("Interval  :", SEND_INTERVAL / 1000, "Detik");
console.log("===========================================");

async function runSimulation() {

  if (currentIndex >= scenario.length) {

    clearInterval(timer);

    console.log("");
    console.log("===========================================");
    console.log("SIMULATION FINISHED");
    console.log("===========================================");
    console.log("Total Packet :", packet);
    console.log("Odometer     :", Math.round(odometer), "meter");
    console.log("Mileage      :", Math.round(mileage), "meter");
    console.log("Last Fuel    :", scenario[scenario.length - 1].fuel_level);
    console.log("Last Lat     :", scenario[scenario.length - 1].latitude);
    console.log("Last Lng     :", scenario[scenario.length - 1].longitude);
    console.log("===========================================");

    process.exit(0);
  }

  await sendPacket(currentIndex);

  currentIndex++;
}

// kirim packet pertama
runSimulation();

// lanjut setiap 3 detik
const timer = setInterval(async () => {

  await runSimulation();

}, SEND_INTERVAL);