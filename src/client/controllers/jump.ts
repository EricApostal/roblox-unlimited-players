import { Controller, OnStart } from "@flamework/core";
import { Players } from "@rbxts/services";
import { Events } from "client/network";

@Controller()
export class JumpController implements OnStart {
    onStart(): void {
        let player = Players.LocalPlayer;
        player.CharacterAdded.Connect((character) => {
            let humanoid = (character.WaitForChild("Humanoid") as Humanoid);

            humanoid.Jumping.Connect((active: boolean) => {
                if (active)
                    Events.OnJump.fire();
            });
        });
    }
}