/**
 * simulator-tcp.js
 *
 * PART 1
 * -------------------------------------------------------
 * Teltonika FMC125 TCP Simulator
 * Compatible with:
 * - Codec 8
 * - Your TeltonikaTcpService
 * - Your TeltonikaParserService
 */

const net = require('net');

const CLIENT_HOST = '192.168.3.93';
const CLIENT_PORT = 5550;

const IMEI = '863719065713472';

const client = new net.Socket();

client.connect(CLIENT_PORT, CLIENT_HOST, () => {

    console.log('=========================================');
    console.log(' TELTONIKA TCP SIMULATOR');
    console.log('=========================================');

    console.log('Connected.');

    sendHandshake();

});

client.on('data', (data) => {

    // Handshake Accepted
    if (data.length === 1 && data[0] === 0x01) {

        console.log('IMEI Accepted');

        const packet = buildCodec8Packet();

        console.log('Packet Length :', packet.length);

        client.write(packet);

        return;
    }

    // AVL ACK

    if (data.length === 4) {

        console.log(
            'Server ACK :',
            data.readUInt32BE(0)
        );

        client.end();
    }

});

client.on('close', () => {

    console.log('Connection Closed');

});

client.on('error', (err) => {

    console.error(err);

});

function sendHandshake() {

    const imei = Buffer.alloc(2 + IMEI.length);

    imei.writeUInt16BE(
        IMEI.length,
        0
    );

    imei.write(
        IMEI,
        2
    );

    console.log('Sending IMEI');

    client.write(imei);

}

/**
 * CRC16 IBM
 * Teltonika AVL
 */

function crc16(buffer) {

    let crc = 0x0000;

    for (let b of buffer) {

        crc ^= b;

        for (let i = 0; i < 8; i++) {

            if (crc & 1)

                crc =
                    (crc >> 1) ^
                    0xA001;

            else

                crc >>= 1;

        }

    }

    return crc & 0xffff;

}

/**
 * Helper
 */

function writeInt8(arr, value) {

    const b = Buffer.alloc(1);

    b.writeInt8(value);

    arr.push(b);

}

function writeUInt8(arr, value) {

    const b = Buffer.alloc(1);

    b.writeUInt8(value);

    arr.push(b);

}

function writeInt16(arr, value) {

    const b = Buffer.alloc(2);

    b.writeInt16BE(value);

    arr.push(b);

}

function writeUInt16(arr, value) {

    const b = Buffer.alloc(2);

    b.writeUInt16BE(value);

    arr.push(b);

}

function writeInt32(arr, value) {

    const b = Buffer.alloc(4);

    b.writeInt32BE(value);

    arr.push(b);

}

function writeUInt32(arr, value) {

    const b = Buffer.alloc(4);

    b.writeUInt32BE(value);

    arr.push(b);

}

function writeUInt64(arr, value) {

    const b = Buffer.alloc(8);

    b.writeBigUInt64BE(
        BigInt(value)
    );

    arr.push(b);

}

/**
 * Akan dibuat pada Part 2
 */

function buildCodec8Packet() {

    throw new Error(
        'Continue Part 2'
    );

}

/**
 * PART 2
 * ----------------------------------------
 * Build Codec 8 Packet
 */

function buildCodec8Packet() {

    const avl = buildAVLRecord();

    const data = [];

    // Codec ID
    writeUInt8(data, 0x08);

    // Number Of Data 1
    writeUInt8(data, 1);

    data.push(avl);

    // Number Of Data 2
    writeUInt8(data, 1);

    const dataField = Buffer.concat(data);

    const packet = [];

    // Preamble
    writeUInt32(packet, 0);

    // AVL Data Length
    writeUInt32(
        packet,
        dataField.length
    );

    packet.push(dataField);

    // CRC16

    const crc = crc16(dataField);

    const crcBuffer = Buffer.alloc(4);

    crcBuffer.writeUInt32BE(crc);

    packet.push(crcBuffer);

    return Buffer.concat(packet);

}

/**
 * AVL RECORD
 */

function buildAVLRecord() {

    const record = [];

    //----------------------------------------
    // Timestamp
    //----------------------------------------

    writeUInt64(
        record,
        Date.now()
    );

    //----------------------------------------
    // Priority
    //----------------------------------------

    writeUInt8(
        record,
        1
    );

    //----------------------------------------
    // Longitude
    //----------------------------------------

    writeInt32(
        record,
        Math.round(
            106.8166667 * 10000000
        )
    );

    //----------------------------------------
    // Latitude
    //----------------------------------------

    writeInt32(
        record,
        Math.round(
            -6.200000 * 10000000
        )
    );

    //----------------------------------------
    // Altitude
    //----------------------------------------

    writeInt16(
        record,
        125
    );

    //----------------------------------------
    // Heading
    //----------------------------------------

    writeUInt16(
        record,
        180
    );

    //----------------------------------------
    // Satellites
    //----------------------------------------

    writeUInt8(
        record,
        12
    );

    //----------------------------------------
    // Speed
    //----------------------------------------

    writeUInt16(
        record,
        45
    );

    //----------------------------------------
    // IO Elements
    //----------------------------------------

    record.push(
        buildIOElements()
    );

    return Buffer.concat(record);

}

/**
 * Akan dibuat pada PART 3
 */

function buildIOElements(){

    throw new Error(
        'Continue Part 3'
    );

}

/**
 * ============================================================
 * PART 3
 * IO ELEMENTS
 * Sesuai dengan TeltonikaParserService Anda
 * ============================================================
 */

function buildIOElements() {

    const io = [];

    //----------------------------------------------------
    // Event ID
    //----------------------------------------------------

    writeUInt8(io, 0);

    //----------------------------------------------------
    // Total IO Elements
    //----------------------------------------------------

    writeUInt8(io, 16);

    /**
     * =====================================================
     * 1 BYTE VALUES
     * =====================================================
     *
     * ignition
     * gsm signal
     * analog
     * accel x
     * accel y
     * accel z
     */

    writeUInt8(io, 6);

    // AVL 239 Ignition
    writeUInt8(io, 239);
    writeInt8(io, 1);

    // AVL 21 GSM Signal
    writeUInt8(io, 21);
    writeInt8(io, 5);

    // AVL 9 Analog Input
    writeUInt8(io, 9);
    writeInt8(io, 2);

    // AVL 17 Accel X
    writeUInt8(io, 17);
    writeInt8(io, -12);

    // AVL 18 Accel Y
    writeUInt8(io, 18);
    writeInt8(io, 7);

    // AVL 19 Accel Z
    writeUInt8(io, 19);
    writeInt8(io, 98);

    /**
     * =====================================================
     * 2 BYTE VALUES
     * =====================================================
     */

    writeUInt8(io, 10);

    // AVL 16 Odometer
    writeUInt8(io, 16);
    writeInt16(io, 1200);

    // AVL 66 External Voltage
    writeUInt8(io, 66);
    writeInt16(io, 12650);

    // AVL 67 Internal Battery
    writeUInt8(io, 67);
    writeInt16(io, 4100);

    // AVL 68 Battery Current
    writeUInt8(io, 68);
    writeInt16(io, 350);

    // AVL 69 GNSS
    writeUInt8(io, 69);
    writeInt16(io, 1);

    // AVL 181 PDOP
    writeUInt8(io, 181);
    writeInt16(io, 15);

    // AVL 182 HDOP
    writeUInt8(io, 182);
    writeInt16(io, 9);

    // AVL 200 Sleep Mode
    writeUInt8(io, 200);
    writeInt16(io, 0);

    // AVL 201 Fuel
    writeUInt8(io, 201);
    writeInt16(io, 80);

    // AVL 202 Fuel Temp
    writeUInt8(io, 202);
    writeInt16(io, 32);

    /**
     * =====================================================
     * 4 BYTE VALUES
     * =====================================================
     */

    writeUInt8(io, 2);

    // AVL 240 Runtime
    writeUInt8(io, 240);
    writeInt32(io, 3600);

    // AVL 241 GSM Operator
    writeUInt8(io, 241);
    writeInt32(io, 51010);

    /**
     * =====================================================
     * 8 BYTE VALUES
     * =====================================================
     */

    writeUInt8(io, 0);

    return Buffer.concat(io);

}

