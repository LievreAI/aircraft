// Copyright (c) 2021-2023 FlyByWire Simulations
//
// SPDX-License-Identifier: GPL-3.0

import { EventBus, HEventPublisher, KeyEventManager, Wait, GameStateProvider } from '@microsoft/msfs-sdk';
import { AtsuSystem } from './systems/atsu';
import { PowerSupplyBusses } from './systems/powersupply';

class SystemsHost extends BaseInstrument {
    private readonly bus: EventBus;

    private readonly hEventPublisher: HEventPublisher;

    // Uncomment once migrated from the A32NX to the A380X
    // private readonly powerSupply: PowerSupplyBusses;
    // private readonly atsu: AtsuSystem;

    private keyInterceptManager: KeyEventManager;

    /**
     * "mainmenu" = 0
     * "loading" = 1
     * "briefing" = 2
     * "ingame" = 3
     */
    private gameState = 0;

    constructor() {
        super();

        this.bus = new EventBus();
        this.hEventPublisher = new HEventPublisher(this.bus);
        // this.powerSupply = new PowerSupplyBusses(this.bus);
        // this.atsu = new AtsuSystem(this.bus);
        Promise.all([
            KeyEventManager.getManager(this.bus),
            Wait.awaitSubscribable(GameStateProvider.get(), (state) => state === GameState.ingame, true),
        ]).then(([keyEventManager]) => {
            this.keyInterceptManager = keyEventManager;
            this.initLighting();
        });
    }

    get templateID(): string {
        return 'A380X_SYSTEMSHOST';
    }

    public getDeltaTime() {
        return this.deltaTime;
    }

    public onInteractionEvent(args: string[]): void {
        this.hEventPublisher.dispatchHEvent(args[0]);
    }

    public connectedCallback(): void {
        super.connectedCallback();

        // this.powerSupply.connectedCallback();
        // this.atsu.connectedCallback();

        // Needed to fetch METARs from the sim
        RegisterViewListener('JS_LISTENER_FACILITY', () => {
            console.log('JS_LISTENER_FACILITY registered.');
        }, true);
    }

    public Update(): void {
        super.Update();

        if (this.gameState !== 3) {
            const gamestate = this.getGameState();
            if (gamestate === 3) {
                this.hEventPublisher.startPublish();
                // this.powerSupply.startPublish();
                // this.atsu.startPublish();
            }
            this.gameState = gamestate;
        }

        // this.powerSupply.update();
        // this.atsu.update();
    }

    private initLighting() {
        console.log('[systems-host] initializing lighting to defaults');

        /** automatic brightness based on ambient light, [0, 1] scale */
        const autoBrightness = Math.max(15, Math.min(85, SimVar.GetSimVarValue('GLASSCOCKPIT AUTOMATIC BRIGHTNESS', 'percent')));

        // OVHD Reading Lights
        this.setPotentiometer(96, 0); // Capt
        this.setPotentiometer(97, 0); // F/O

        // Glareshield
        this.setPotentiometer(84, autoBrightness < 50 ? 1.5 * autoBrightness : 0); // Int Lt
        this.setPotentiometer(87, autoBrightness); // Lcd Brt
        this.setPotentiometer(10, 0); // table Cpt
        this.setPotentiometer(11, 0); // table F/O

        // Instruments Cpt
        this.setPotentiometer(88, autoBrightness); // PFD
        this.setPotentiometer(89, autoBrightness); // ND
        this.setPotentiometer(94, autoBrightness/2); // wxRadar
        this.setPotentiometer(98, autoBrightness); // MFD
        this.setPotentiometer(8, autoBrightness < 50 ? 20 : 0); // console light

        // Instruments F/O
        this.setPotentiometer(90, autoBrightness); // PFD
        this.setPotentiometer(91, autoBrightness); // ND
        this.setPotentiometer(95, autoBrightness/2); // wxRadar
        this.setPotentiometer(99, autoBrightness); // MFD
        this.setPotentiometer(9, autoBrightness < 50 ? 20 : 0); // console light

        // Pedestal
        this.setPotentiometer(80, autoBrightness); // rmpCptLightLevel
        this.setPotentiometer(81, autoBrightness); // rmpFoLightLevel
        this.setPotentiometer(82, autoBrightness); // rmpOvhdLightLevel
        this.setPotentiometer(92, autoBrightness); // ecamUpperLightLevel
        this.setPotentiometer(93, autoBrightness); // ecamLowerLightLevel
        this.setPotentiometer(76, autoBrightness); // pedFloodLightLevel
        this.setPotentiometer(83, autoBrightness); // mainPnlFloodLightLevel
        this.setPotentiometer(85, autoBrightness); // integralLightLevel
        this.setPotentiometer(7, autoBrightness); // ambientLightLevel

    }

    private setPotentiometer(potentiometer: number, brightness: number) {
        this.keyInterceptManager.triggerKey('LIGHT_POTENTIOMETER_SET', false, potentiometer, brightness);
    }
}

registerInstrument('systems-host', SystemsHost);
