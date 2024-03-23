import { BaseComponent } from "@flamework/components";
import { Controller, OnStart } from "@flamework/core";
import { StarterGui, Chat, RunService, Players } from "@rbxts/services";
import { Events } from "client/network";

let TextChatService = game.GetService("TextChatService")

// @Controller()
// export class ChatController extends BaseComponent implements OnStart {
//     onStart(): void {
//         // todo: reimplement using remote
//     }
// }


Events.SendChatMessage.connect((message: { playerId: number, message: string }) => {
    (TextChatService.WaitForChild("TextChannels").WaitForChild("RBXGeneral") as TextChannel).DisplaySystemMessage(`${Players.GetPlayerByUserId(message.playerId)}: ${message.message}`);
})
