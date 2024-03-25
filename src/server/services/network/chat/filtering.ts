import { OnStart, Service } from "@flamework/core";
import { TextService } from "@rbxts/services";
import { Functions } from "server/network";

@Service()
export class ChatFilterService implements OnStart {
    onStart() {
        Functions.filterString.setCallback((playerId, text) => this.filterString(playerId.UserId, text));
    }

    private filterString(playerId: number, text: string): string {
        return (TextService.FilterStringAsync(text, playerId) as TextFilterResult).GetNonChatStringForUserAsync(playerId);
    }
}