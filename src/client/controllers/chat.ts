import { BaseComponent } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import { StarterGui, Chat, RunService, Players } from "@rbxts/services";
import { Events } from "client/network";

let TextChatService = game.GetService("TextChatService");

@Controller()
export class ChatReplicator extends BaseComponent implements OnStart {
    onStart(): void {

        let hexPlayerMap = new Map<string, string>();

        Events.SendChatMessage.connect((message: { playerId: number, message: string }) => {
            let formattedMessage = `${Players.GetNameFromUserIdAsync(message.playerId)}: ${message.message}`;

            (TextChatService.WaitForChild("TextChannels").WaitForChild("RBXGeneral") as TextChannel).DisplaySystemMessage(formattedMessage);
        })

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
}