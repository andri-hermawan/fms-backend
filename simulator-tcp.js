const net = require('net');

const CLIENT_PORT = 8888;
const CLIENT_HOST = '127.0.0.1';
const IMEI = 'FMC125-001';

const client = new net.Socket();

client.connect(CLIENT_PORT, CLIENT_HOST, () => {
    console.log('CONNECTED TO SERVER');
    
    // --- STEP 1: KIRIM HANDSHAKE (IMEI) ---
    // Format: 2 byte length + string IMEI
    const imeiBuffer = Buffer.alloc(2 + IMEI.length);
    imeiBuffer.writeInt16BE(IMEI.length, 0);
    imeiBuffer.write(IMEI, 2);
    
    console.log('Sending Handshake (IMEI)...');
    client.write(imeiBuffer);
});

client.on('data', (data) => {
    // Jika server membalas 01, berarti Handshake sukses
    if (data.length === 1 && data[0] === 0x01) {
        console.log('HANDSHAKE ACCEPTED (Received 01)');
        
        // --- STEP 2: KIRIM DATA CODEC 8 (DUMMY PACKET) ---
        // Ini adalah contoh paket biner Codec 8 sederhana
        const codec8Packet = Buffer.from([
            0x00, 0x00, 0x00, 0x00, // Preamble
            0x00, 0x00, 0x00, 0x23, // Data Field Length
            0x08,                   // Codec ID (Codec 8)
            0x01,                   // Number of Data (1 record)
            // -- Start of AVL Record --
            0x00, 0x00, 0x01, 0x8F, 0x0A, 0x3E, 0x4E, 0x80, // Timestamp (JS Date)
            0x01,                   // Priority
            0x3F, 0xB6, 0x93, 0x10, // Longitude (106.885...)
            0xDD, 0xDF, 0x9D, 0x30, // Latitude (-5.71...)
            0x00, 0x64,             // Altitude (100m)
            0x00, 0x00,             // Angle (0)
            0x00,                   // Satellites
            0x00, 0x28,             // Speed (40 km/h)
            // -- IO Elements --
            0x00,                   // Event ID
            0x01,                   // Total Element (1 element)
            0x01,                   // 1-byte elements count (1)
            0xEF,                   // ID 239 (Ignition)
            0x01,                   // Value 1 (ON)
            0x00, 0x00, 0x00, 0x00, // 2, 4, 8 byte elements (0 count)
            0x01,                   // Number of Data (Repeat)
            0x00, 0x00, 0x4D, 0x2A  // CRC
        ]);

        console.log('Sending Codec 8 Packet...');
        console.log('Contoh data dari teltonika...');
        console.log('Contoh data dari teltonika caoba lagi...');
        client.write(codec8Packet);
    } 
    // Jika server membalas dengan 4 byte, itu adalah ACK jumlah data
    else if (data.length === 4) {
        const numData = data.readInt32BE(0);
        console.log(`SERVER ACKNOWLEDGED: ${numData} records processed.`);
        client.destroy(); // Close connection
    }
});

client.on('close', () => console.log('CONNECTION CLOSED'));