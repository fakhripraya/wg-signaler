import mediasoup from 'mediasoup';
import { mediaCodecs, webRtcTransport_options } from '../variables/mediasoup.js';
import { CONSUMER, PRODUCER, USER_ALREADY_JOIN } from '../variables/general.js';

const initializeSignaler = (io) => {
    /**
     * Worker
     * |-> Router(s)
     *     |-> Producer Transport(s)
     *         |-> Producer
     *     |-> Consumer Transport(s)
     *         |-> Consumer 
     **/
    let worker;
    let rooms = {};
    let globalPeers = {};

    // FUNCTION SPECIFIC //
    const createWorker = async () => {
        // USE PM2 TO CREATE CLUSTERING NODE JS PROCESS
        // SO WHEN THE MAX PORT REACH THERE IS STILL MORE WORKER THAT CAN PROCESS 
        // Create worker to handle the webRTC background process
        worker = await mediasoup.createWorker({
            rtcMinPort: process.env.APP_RTC_MIN_PORT,
            rtcMaxPort: process.env.APP_RTC_MAX_PORT,
        })
        console.log(`created WORKER with pid ${worker.pid}`)

        // Listener that will fire on worker died
        worker.on('died', error => {
            // This implies something serious happened, so kill the application
            console.error(`WORKER ${worker.pid} - has died, possible error: ${error}`)
            // This will kill the app, but PM2 will try to restart it again
            setTimeout(() => process.exit(1), 2000);
        })

        return worker;
    }

    // THIS IS WHERE THE LISTENER START
    // We create a Worker as soon as our application starts
    // And then we add the socket listeners
    worker = createWorker();
    io.on('connection', async socket => {

        // SOCKET FUNCTIONS
        const createOrJoinRoom = async ({ storeId, room, user }, socket) => {
            // worker.createRouter(options)
            // options = { mediaCodecs, appData }
            // mediaCodecs -> defined above
            // appData -> custom application data - we are not supplying any
            // none of the two are required
            let router;
            let peers = [];
            let peer = {
                userId: user.userId,
                socket,
                transports: [],
                producers: [],
                consumers: [],
                peerDetails: {
                    user: user,
                    isAdmin: false, // Is this Peer the Admin?
                }
            };

            if (rooms[room.roomId] && rooms[room.roomId].router) {
                router = rooms[room.roomId].router;
                peers = rooms[room.roomId].peers || [];
                console.log(`SOCKET ${socket.id} - ROOM ID : ${room.roomId} exist, with ROUTER ID: ${router.id}`);
            } else {
                router = await worker.createRouter({ mediaCodecs });
                console.log(`SOCKET ${socket.id} - created ROUTER with ID: ${router.id}`, peers.length);
            }

            // declare error here
            const error = {
                router: null,
                error: `SOCKET ${socket.id} - error joining room: ${USER_ALREADY_JOIN}`
            };
            // peer used user id to uniquely identified the peer by user reference
            // it is to prevent double join on different device
            // check double join on different device
            for (const [key, value] of Object.entries(globalPeers)) {
                if (value.userId === user.userId)
                    return error;
            }
            if (!(user.userId in peers)) {
                peers[user.userId] = peer;
                globalPeers[socket.id] = {
                    socketId: socket.id,
                    userId: user.userId,
                    roomId: room.roomId,
                    storeId: storeId
                }
            }
            else return error;
            console.log(`SOCKET ${socket.id} - user joined the room with user Id: ${user.userId}`);

            // Room info that hold the information of the current room the peer want to join 
            rooms[room.roomId] = {
                storeId: storeId,
                router: router,
                details: room,
                peers: peers,
            }

            return { router: router, error: null };
        }

        const createWebRtcTransport = async (router) => {
            return new Promise(async (resolve, reject) => {
                try {
                    // create new transport 
                    let transport = await router.createWebRtcTransport(webRtcTransport_options);
                    console.log(`SOCKET ${socket.id} - TRANSPORT created with id: ${transport.id}`);

                    // create the event listener for the transport
                    transport.on('dtlsstatechange', dtlsState => {
                        console.log(`SOCKET ${socket.id} - DTLS STATE: ${dtlsState}`);
                        if (dtlsState === 'closed') transport.close();
                    });

                    // on router close event
                    transport.on('routerclose', () => {
                        console.log(`SOCKET ${socket.id} - ${transport.id} TRANSPORT closed because of router closed`);
                    });

                    resolve(transport);
                } catch (error) {
                    reject(error);
                }
            })
        }

        const getAllPeers = (roomId) => {
            return rooms[roomId].peers;
        }

        const addTransport = ({ transport, roomId, userId, isConsumer }) => {
            // using memory reference to update the peers state
            console.log(`SOCKET ${socket.id} - adding newly created transport to the user id: ${userId}, inside the room: ${roomId}`);
            let peers = getAllPeers(roomId);
            peers[userId] = {
                ...peers[userId],
                transports: [
                    ...peers[userId].transports,
                    {
                        transport: transport,
                        transportKind: isConsumer ? CONSUMER : PRODUCER
                    },
                ]
            }
        }

        const getProducerTransport = (roomId, userId, producerTransportId) => {
            // filter the transports from the user peer info inside the room
            let transports = rooms[roomId].peers[userId].transports;
            const producerTransport = transports.find(data => data.transport.id === producerTransportId && data.transportKind === PRODUCER);
            return producerTransport.transport;
        }

        const getConsumerTransport = (roomId, userId, consumerTransportId) => {
            // filter the transports from the user peer info inside the room
            let transports = rooms[roomId].peers[userId].transports;
            const consumerTransport = transports.find(data => data.transport.id === consumerTransportId && data.transportKind === CONSUMER);
            return consumerTransport.transport;
        }

        const addProducer = (producer, roomId, userId) => {
            // using memory reference to update the peers state
            console.log(`SOCKET ${socket.id} - adding newly created producer to the user id: ${userId}, inside the room: ${roomId}`);
            let peers = getAllPeers(roomId);
            peers[userId] = {
                ...peers[userId],
                producers: [
                    ...peers[userId].producers,
                    producer
                ]
            }
        }

        const getConsumer = (roomId, userId, consumerId) => {
            // filter the transports from the user peer info inside the room
            let peers = getAllPeers(roomId);
            const finding = peers[userId].consumers.find(consumer => consumer.id === consumerId);
            return finding;
        }

        const addConsumer = (consumer, roomId, userId) => {
            // using memory reference to update the peers state
            console.log(`SOCKET ${socket.id} - adding newly created consumer to the user id: ${userId}, inside the room: ${roomId}`);
            let peers = getAllPeers(roomId);
            peers[userId] = {
                ...peers[userId],
                consumers: [
                    ...peers[userId].consumers,
                    consumer
                ]
            }
        }

        const informConsumers = (roomId, userId, producerId) => {
            // A new producer just joined
            // let all consumers to consume this producer
            console.log(`SOCKET ${socket.id} - just joined, with PRODUCER ID ${producerId} and ROOM ID ${roomId}`);
            const peers = getAllPeers(roomId);
            console.log(`SOCKET ${socket.id} - broadcaster peer USER ID: ${userId}`);
            for (const [key, value] of Object.entries(peers)) {
                if (key !== userId) {
                    const producerSocket = value.socket;
                    // use socket to send producer id to producer
                    producerSocket.emit('new-producer', { producerId: producerId });
                }
            }
        }

        // SOCKET EVENTS
        console.log(`SOCKET ${socket.id} - has been connected`);
        socket.emit('connection-success', {
            socketId: socket.id,
        })

        socket.on('join-room', async (joinDetails, callback) => {
            // create Router if it does not exist
            // const router1 = rooms[roomName] && rooms[roomName].get('data').router || await createRoom(roomName, socket.id)
            const { router, error } = await createOrJoinRoom(joinDetails, socket);
            if (error) return socket.emit('user-already-joined');

            // get Router RTP Capabilities
            const rtpCapabilities = router.rtpCapabilities;

            // call callback from the client and send back the rtpCapabilities
            callback({ rtpCapabilities });
        })

        // Client emits a request to create server side Transport
        // We need to differentiate between the producer and consumer transports
        socket.on('create-webrtc-transport', async ({ isConsumer, room, user }, callback) => {
            // get Router (Room) object this peer is in based on RoomName
            const router = rooms[room.roomId].router;
            createWebRtcTransport(router)
                .then((transport) => {
                    // add transport to Peer's properties
                    addTransport({
                        transport,
                        roomId: room.roomId,
                        userId: user.userId,
                        isConsumer
                    });
                    callback({
                        params: {
                            id: transport.id,
                            iceParameters: transport.iceParameters,
                            iceCandidates: transport.iceCandidates,
                            dtlsParameters: transport.dtlsParameters,
                        }
                    });
                }).catch((error) => {
                    console.log(`SOCKET ${socket.id} - error creating WebRtcTransport for ${isConsumer ? 'consumer' : 'producer'}: ${error}`);
                    callback({
                        params: {
                            error: `${error}`,
                        }
                    });
                });
        })

        // see client's socket.emit('transport-connect', ...)
        socket.on('transport-connect', ({ dtlsParameters, room, user, producerTransportId }) => {
            console.log(`SOCKET ${socket.id} - DTLS PARAMS: ${JSON.stringify(dtlsParameters)}`);
            getProducerTransport(room.roomId, user.userId, producerTransportId).connect({ dtlsParameters });
        })

        // see client's socket.emit('transport-produce', ...)
        socket.on('transport-produce', async ({
            user,
            room,
            producerTransportId,
            kind,
            rtpParameters,
            appData }, callback) => {
            // call produce based on the prameters from the client
            console.log(`SOCKET ${socket.id} - creating PRODUCER...`);
            const producer = await getProducerTransport(
                room.roomId,
                user.userId,
                producerTransportId
            ).produce({
                kind,
                rtpParameters,
            });

            // add producer to the producers array
            console.log(`SOCKET ${socket.id} - ADDING PRODUCER ID: ${producer.id}, KIND: ${producer.kind}`);
            addProducer(producer, room.roomId, user.userId);
            informConsumers(room.roomId, user.userId, producer.id);

            producer.on('transportclose', () => {
                console.log(`SOCKET ${socket.id} - transport for this producer closed, PRODUCER ID: ${producer.id}`);
            })

            // Send back to the client the Producer's id
            const peers = getAllPeers(room.roomId);
            console.log(rooms);
            callback({
                producerId: producer.id,
                peersExist: Object.keys(peers).length > 1 ? true : false
            });
        })

        socket.on('get-producers', ({ user, room }, callback) => {
            // get all peers in the room
            // and return all producer transports
            let peers = getAllPeers(room.roomId);
            let producerList = [];
            console.log(`SOCKET ${socket.id} - user with ID ${user.userId} requesting remote producers inside the room`);
            for (const [key, value] of Object.entries(peers)) {
                if (key === user.userId) continue;
                console.log(`LOOPED USER: ${key}`);
                console.log("LOOPING THROUGH KEY PRODUCERS...");
                value.producers.forEach(producer => {
                    console.log(producer)
                    producerList = [...producerList, producer.id];
                })
            }

            // return the producer list back to the client
            callback(producerList);
        })

        // see client's socket.emit('transport-recv-connect', ...)
        socket.on('transport-recv-connect', async ({
            dtlsParameters,
            room,
            user,
            serverConsumerTransportId }) => {
            console.log(`DTLS PARAMS: ${JSON.stringify(dtlsParameters)}`)
            const consumerTransport = getConsumerTransport(room.roomId, user.userId, serverConsumerTransportId);
            await consumerTransport.connect({ dtlsParameters })
        })

        socket.on('transport-recv-consume', async ({
            room,
            user,
            rtpCapabilities,
            remoteProducerId,
            serverConsumerTransportId }, callback) => {
            try {

                const router = rooms[room.roomId].router;
                let peers = getAllPeers(room.roomId);
                let transports = peers[user.userId].transports;
                let consumers = peers[user.userId].consumers;
                let consumerTransport = getConsumerTransport(room.roomId, user.userId, serverConsumerTransportId);

                // check if the router can consume the specified producer
                if (router.canConsume({
                    producerId: remoteProducerId,
                    rtpCapabilities
                })) {
                    // transport can now consume and return a consumer
                    const consumer = await consumerTransport.consume({
                        producerId: remoteProducerId,
                        rtpCapabilities,
                        paused: true,
                    })

                    consumer.on('transportclose', () => {
                        console.log(`SOCKET ${socket.id} - TRANSPORT close from consumer with TRANSPORT ID ${serverConsumerTransportId} and USER ID ${user.userId}`);
                    })

                    consumer.on('producerclose', () => {
                        // emit producer-closed signal to signal the client that the producer closed so it can do some clean up
                        console.log(`SOCKET ${socket.id} - producer-closed with ID: `, remoteProducerId);
                        socket.emit('producer-closed', {
                            serverConsumerId: consumer.id,
                            serverConsumerKind: consumer.kind,
                            remoteProducerId
                        });

                        consumerTransport.close([]);
                        transports = transports.filter(data => data.transport.id !== consumerTransport.id);
                        consumer.close();
                        consumers = consumers.filter(data => data.id !== consumer.id);
                    })

                    // store the consumer in the server memory
                    addConsumer(consumer, room.roomId, user.userId);
                    // from the consumer extract the following params
                    // to send back to the Client
                    const params = {
                        id: consumer.id,
                        producerId: remoteProducerId,
                        kind: consumer.kind,
                        rtpParameters: consumer.rtpParameters,
                    }

                    // send the parameters to the client
                    callback({ params });
                } else {
                    throw new Error(`Cant consume the remote producer with id: ${remoteProducerId}!`);
                }
            } catch (error) {
                console.log(error.message);
                callback({
                    params: {
                        error: error
                    }
                });
            }
        })

        socket.on('consumer-resume', async ({ room, user, serverConsumerId }) => {
            const consumer = getConsumer(room.roomId, user.userId, serverConsumerId);
            console.log(`SOCKET ${socket.id} - CONSUMER WITH ID : ${consumer.id} resume`);
            await consumer.resume();
        })

        socket.on('disconnect', () => {
            // do some cleanup
            // return if the socket does not exist in the room
            const disconnectingPeer = globalPeers[socket.id];
            if (!disconnectingPeer) return;

            console.log(`SOCKET ${socket.id} - peer disconnected with USER ID ${disconnectingPeer.userId}, from the ROOM ID: ${disconnectingPeer.roomId}`);
            if (!rooms[disconnectingPeer.roomId]) return;
            let peers = getAllPeers(disconnectingPeer.roomId);
            if (!peers[disconnectingPeer.userId]) return;

            // remove socket from room
            const filteredPeers = Object.fromEntries(Object.entries(rooms[disconnectingPeer.roomId].peers).filter(([key]) => {
                return key !== disconnectingPeer.userId
            }));

            // cleanup the router if room not used
            if (Object.entries(filteredPeers).length === 0) {
                rooms[disconnectingPeer.roomId].router.close();
                delete rooms[disconnectingPeer.roomId];
            } else {
                peers[disconnectingPeer.userId].producers[0].close();
                rooms[disconnectingPeer.roomId] = {
                    ...rooms[disconnectingPeer.roomId],
                    peers: filteredPeers
                }
            }

            // delete room and global peer
            console.log(rooms[disconnectingPeer.roomId]);
            delete globalPeers[socket.id];
        })
    })
}

export default initializeSignaler;