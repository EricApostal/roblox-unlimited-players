import { StarterGui, Chat, RunService, Players } from "@rbxts/services";
import { Events } from "client/network";

let TextChatService = game.GetService("TextChatService");

export namespace ChatReplicator {
    let hexPlayerMap = new Map<string, string>();

    export function sendMessage(playerId: number, message: string) {
        let formattedMessage = `${Players.GetNameFromUserIdAsync(playerId)}: ${message}`;

        (TextChatService.WaitForChild("TextChannels").WaitForChild("RBXGeneral") as TextChannel).DisplaySystemMessage(formattedMessage);
    };

    TextChatService.OnIncomingMessage = (textChatMessage) => {
        let channel = textChatMessage.TextChannel;
        if (channel && (channel.Name === "RBXGeneral")) {
            let senderName = textChatMessage.Text.split(":")[0];
            if (textChatMessage.Text.split(":").size() === 1) {
                return undefined;
            }

            let overrideProperties = new Instance("TextChatMessageProperties");

            let randomHexColor = hexPlayerMap.get(senderName)
            if (!randomHexColor) {
                hexPlayerMap.set(senderName, string.format("#%06x", math.random(0, 0xFFFFFF)));
                randomHexColor = hexPlayerMap.get(senderName);
            }

            let split = textChatMessage.Text.split(":");
            split.remove(0);
            let content = split.join(":");

            overrideProperties.Text = string.format(`<font color='${randomHexColor}'>%s</font>: %s`, senderName, content);

            return overrideProperties;
        }
        return undefined;
    }
}