import { StarterGui, Chat, RunService, Players } from "@rbxts/services";
import { Events, Functions } from "client/network";

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
            let senderName = textChatMessage.PrefixText.gsub(":", "")[0];
            if (senderName === Players.LocalPlayer.Name) {
                let overrideProperties = new Instance("TextChatMessageProperties");
                overrideProperties.Text = textChatMessage.Text;
                overrideProperties.PrefixText = textChatMessage.PrefixText;
                return overrideProperties;
            }

            let overrideProperties = new Instance("TextChatMessageProperties");

            let randomHexColor = hexPlayerMap.get(senderName)
            if (!randomHexColor) {
                hexPlayerMap.set(senderName, string.format("#%06x", math.random(0, 0xFFFFFF)));
                randomHexColor = hexPlayerMap.get(senderName);
            }

            let split = textChatMessage.Text.split(":");
            split.remove(0);

            let result;
            Functions.filterString.invoke(split.join(":")).andThen((filteredMessage) => {
                result = filteredMessage;
            });

            while (!result) wait();

            overrideProperties.Text = string.format(`<font color='${randomHexColor}'>%s</font>: %s`, senderName, result);

            return overrideProperties;
        }
        return undefined;
    }
}