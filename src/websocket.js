const { LogType, log, log_raw } = require("./logger.js");
const WebSocket = require("ws");

const db = process.db.users;

const ResponseResults = {
    RelationshipChanged: 1,
    MessageReceived: 2,
    MessageDeleted: 3,
    PresenceHeartbeatResponse: 4,
    SubscriptionListUpdated: 9,
    SubscriptionUpdateProfile: 11,
    SubscriptionUpdatePresence: 12,
    SubscriptionUpdateGameSession: 13,
    SubscriptionUpdateRoom: 15,
    ModerationQuitGame: 20,
    ModerationUpdateRequired: 21,
    ModerationKick: 22,
    ModerationKickAttemptFailed: 23,
    ServerMaintenance: 25,
    GiftPackageReceived: 30,
    ProfileJuniorStatusUpdate: 40,
    RelationshipsInvalid: 50,
    StorefrontBalanceAdd: 60,
    ConsumableMappingAdded: 70,
    ConsumableMappingRemoved: 71,
    PlayerEventCreated: 80,
    PlayerEventUpdated: 81,
    PlayerEventDeleted: 82,
    PlayerEventResponseChanged: 83,
    PlayerEventResponseDeleted: 84,
    PlayerEventStateChanged: 85,
    ChatMessageReceived: 90,
};

async function processRequest(data) {
    let res = "";

    try {
        log(LogType.WS, `Data received: ${data}`);
        data = JSON.parse(data);
    } catch {
        return JSON.stringify({ Id: 0, Msg: {} });
    }

    try {
        if (data.api === "playerSubscriptions/v1/update") {
            log(LogType.WS, `Presence update called!`);
            res = await createResponse(ResponseResults.SubscriptionUpdatePresence, data);
        } else if (data.api === "heartbeat2") {
            log(LogType.WS, `Heartbeat called!`);
            res = await createResponse(ResponseResults.PresenceHeartbeatResponse, data);
        } else {
            res = JSON.stringify({ Id: 0, Msg: {} });
        }
    } catch (err) {
        res = JSON.stringify({ Id: 0, Msg: {} });
    }

    log(LogType.WS, `Data sent: ${res}`);
    return res;
}

async function createResponse(id, data) {
    const playerId = data?.param?.PlayerIds?.[0];

    if (!playerId) {
        return JSON.stringify({
            Id: id,
            Msg: {
                PlayerId: null,
                IsOnline: false,
                InScreenMode: false,
                GameSession: null,
            },
        });
    }

    let usr;
    try {
        usr = await db.findOne({ where: { id: playerId } });
    } catch {
        usr = null;
    }

    let ses = null;

    if (usr?.session) {
        try {
            ses = JSON.parse(usr.session);
        } catch {
            ses = null;
        }
    }

    return JSON.stringify({
        Id: id,
        Msg: {
            PlayerId: playerId,
            IsOnline: true,
            InScreenMode: false,
            GameSession: ses,
        },
    });
}

function start(server) {
    const wss = new WebSocket.Server({ server });

    wss.on("connection", (ws) => {
        log(LogType.Debug, "WS: A client connected!");

        ws.on("message", async (data) => {
            try {
                const response = await processRequest(data);
                ws.send(response);
            } catch {
                ws.send(JSON.stringify({ Id: 0, Msg: {} }));
            }
        });

        ws.on("close", () => {
            log(LogType.Debug, "WS: A client disconnected!");
        });
    });
}

module.exports = { start };
