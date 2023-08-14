// This is an Array of RtpCapabilities
// https://mediasoup.org/documentation/v3/mediasoup/rtp-parameters-and-capabilities/#RtpCodecCapability
// list of media codecs supported by mediasoup ...
// https://github.com/versatica/mediasoup/blob/v3/src/supportedRtpCapabilities.ts
export const mediaCodecs = [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
            'x-google-start-bitrate': 1000,
        },
    },
]

// https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
export const webRtcTransport_options = {
    listenIps: [
        {
            ip: '0.0.0.0',
            announcedIp: '127.0.0.1'
        }
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
}