import {
  DisplayComponent,
  Subscribable,
  VNode,
  FSComponent,
  EventBus,
  MappedSubject,
  Subject,
  ConsumerSubject,
  SubscribableMapFunctions,
} from '@microsoft/msfs-sdk';
import { EwdSimvars } from 'instruments/src/EWD/shared/EwdSimvarPublisher';
import {
  GaugeComponent,
  GaugeMarkerComponent,
  GaugeThrustComponent,
  splitDecimals,
  ThrottlePositionDonutComponent,
  ThrustTransientComponent,
} from 'instruments/src/MsfsAvionicsCommon/gauges';

interface ThrustGaugeProps {
  bus: EventBus;
  x: number;
  y: number;
  engine: number;
  active: Subscribable<boolean>;
  n1Degraded: Subscribable<boolean>;
}

export class ThrustGauge extends DisplayComponent<ThrustGaugeProps> {
  private readonly sub = this.props.bus.getSubscriber<EwdSimvars>();

  private readonly n1 = ConsumerSubject.create(
    this.sub.on(`n1_${this.props.engine}`).withPrecision(2).whenChanged(),
    0,
  );

  private readonly engineState = ConsumerSubject.create(
    this.sub.on(`engine_state_${this.props.engine}`).whenChanged(),
    0,
  );

  private readonly throttlePositionN1 = ConsumerSubject.create(
    this.sub.on(`throttle_position_n1_${this.props.engine}`).withPrecision(2).whenChanged(),
    0,
  );

  private readonly n1Commanded = ConsumerSubject.create(
    this.sub.on(`n1_commanded_${this.props.engine}`).withPrecision(2).whenChanged(),
    0,
  );

  private readonly athrEngaged = ConsumerSubject.create(
    this.sub.on('autothrustStatus').withPrecision(2).whenChanged(),
    0,
  ).map((it) => it !== 0);

  private readonly thrustLimitIdle = ConsumerSubject.create(this.sub.on('thrust_limit_idle').whenChanged(), 0);
  private readonly thrustLimitToga = ConsumerSubject.create(this.sub.on('thrust_limit_toga').whenChanged(), 0);
  private readonly thrustLimitRev = ConsumerSubject.create(this.sub.on('thrust_limit_rev').whenChanged(), 0);

  private readonly packs1 = ConsumerSubject.create(this.sub.on('packs1').whenChanged(), false);
  private readonly packs2 = ConsumerSubject.create(this.sub.on('packs2').whenChanged(), false);

  private readonly revDeploying = ConsumerSubject.create(
    this.sub.on(`reverser_deploying_${this.props.engine}`).whenChanged(),
    false,
  );
  private readonly revDeployed = ConsumerSubject.create(
    this.sub.on(`reverser_deployed_${this.props.engine}`).whenChanged(),
    false,
  );
  private readonly revSelected = ConsumerSubject.create(
    this.sub.on(`thrust_reverse_${this.props.engine}`).whenChanged(),
    false,
  );

  private readonly revVisible = MappedSubject.create(
    SubscribableMapFunctions.or(),
    this.revDeployed,
    this.revDeploying,
    this.revSelected,
  );

  private readonly thrustLimitMax = MappedSubject.create(
    ([packs1, packs2, thrustLimitToga]) => (!packs1 && !packs2 ? thrustLimitToga : thrustLimitToga + 0.6),
    this.packs1,
    this.packs2,
    this.thrustLimitToga,
  );

  private readonly thrIdleOffset = this.engineState.map((es) => (es === 1 ? 0.042 : 0));

  private readonly throttleTarget = MappedSubject.create(
    ([throttlePositionN1, thrustLimitIdle, thrustLimitMax, thrIdleOffset]) =>
      ((throttlePositionN1 - thrustLimitIdle) / (thrustLimitMax - thrustLimitIdle)) * (1 - thrIdleOffset) +
      thrIdleOffset,
    this.throttlePositionN1,
    this.thrustLimitIdle,
    this.thrustLimitMax,
    this.thrIdleOffset,
  );

  private readonly autoThrottleTarget = MappedSubject.create(
    ([n1Commanded, thrustLimitIdle, thrustLimitMax, thrIdleOffset]) =>
      ((n1Commanded - thrustLimitIdle) / (thrustLimitMax - thrustLimitIdle)) * (1 - thrIdleOffset) + thrIdleOffset,
    this.n1Commanded,
    this.thrustLimitIdle,
    this.thrustLimitMax,
    this.thrIdleOffset,
  );

  private readonly throttleTargetReverse = MappedSubject.create(
    ([throttlePositionN1, thrustLimitIdle, thrustLimitRev]) =>
      (throttlePositionN1 - thrustLimitIdle) / (-thrustLimitRev - thrustLimitIdle),
    this.throttlePositionN1,
    this.thrustLimitIdle,
    this.thrustLimitRev,
  );

  private readonly thrustPercent = MappedSubject.create(
    ([n1, thrustLimitIdle, thrustLimitMax, thrIdleOffset]) =>
      Math.min(
        1,
        Math.max(0, (n1 - thrustLimitIdle) / (thrustLimitMax - thrustLimitIdle)) * (1 - thrIdleOffset) + thrIdleOffset,
      ) * 100,
    this.n1,
    this.thrustLimitIdle,
    this.thrustLimitMax,
    this.thrIdleOffset,
  );

  private readonly thrustPercentReverse = MappedSubject.create(
    ([n1, thrustLimitIdle, thrustLimitRev]) =>
      Math.min(1, Math.max(0, (n1 - thrustLimitIdle) / (-thrustLimitRev - thrustLimitIdle))) * 100,
    this.n1,
    this.thrustLimitIdle,
    this.thrustLimitRev,
  );

  private thrustPercentSplit1 = this.thrustPercent.map((thr) => splitDecimals(thr)[0]);
  private thrustPercentSplit2 = this.thrustPercent.map((thr) => splitDecimals(thr)[1]);

  private readonly availVisible = MappedSubject.create(
    ([n1, thrustLimitIdle, engineState]) => n1 > Math.floor(thrustLimitIdle) && engineState === 2,
    this.n1,
    this.thrustLimitIdle,
    this.engineState,
  );

  private readonly availRevVisible = MappedSubject.create(
    SubscribableMapFunctions.or(),
    this.availVisible,
    this.revDeployed,
    this.revDeploying,
  );

  private readonly availRevText = this.availVisible.map((it) => (it ? 'AVAIL' : 'REV'));

  private radius = 64;
  private startAngle = 230;
  private endAngle = 90;
  private min = 0;
  private max = 10;
  private revStartAngle = 130;
  private revEndAngle = 230;
  private revRadius = 58;
  private revMin = 0;
  private revMax = 3;

  render() {
    return (
      <>
        <g id={`Thrust-indicator-${this.props.engine}`}>
          <g
            visibility={MappedSubject.create(
              ([a, n1d]) => (!a || n1d ? 'inherit' : 'hidden'),
              this.props.active,
              this.props.n1Degraded,
            )}
          >
            <GaugeComponent
              x={this.props.x}
              y={this.props.y + 20}
              radius={this.radius}
              startAngle={320}
              endAngle={40}
              visible={Subject.create(true)}
              largeArc={0}
              sweep={0}
              class="GaugeComponent SW2 AmberLine"
            />
            <text class="F26 End Amber Spread" x={this.props.x + 55} y={this.props.y - 48}>
              THR XX
            </text>
          </g>
          <g
            visibility={MappedSubject.create(
              ([a, n1d]) => (a && !n1d ? 'inherit' : 'hidden'),
              this.props.active,
              this.props.n1Degraded,
            )}
          >
            <g visibility={this.revVisible.map((it) => (!it ? 'inherit' : 'hidden'))}>
              <text class="F26 End Green" x={this.props.x + 48} y={this.props.y + 47}>
                {this.thrustPercentSplit1}
              </text>
              <text class="F26 End Green" x={this.props.x + 62} y={this.props.y + 47}>
                .
              </text>
              <text class="F20 End Green" x={this.props.x + 78} y={this.props.y + 47}>
                {this.thrustPercentSplit2}
              </text>
              <GaugeThrustComponent
                x={this.props.x}
                y={this.props.y}
                valueIdle={0.3}
                valueMax={10}
                radius={this.radius}
                startAngle={this.startAngle}
                endAngle={this.endAngle}
                min={this.min}
                max={this.max}
                visible={MappedSubject.create(
                  ([availVis, es]) => availVis || es === 1,
                  this.availVisible,
                  this.engineState,
                )}
                class="GaugeComponent GaugeThrustFill"
              />
              <AvailRev
                x={this.props.x - 18}
                y={this.props.y - 14}
                mesg={this.availRevText}
                visible={this.availRevVisible}
                revDoorOpen={this.revDeployed}
              />
              <ThrustTransientComponent
                x={this.props.x}
                y={this.props.y}
                min={this.min / 10}
                max={this.max / 10}
                thrustActual={this.thrustPercent.map((it) => it / 100)}
                thrustTarget={this.autoThrottleTarget}
                radius={this.radius}
                startAngle={this.startAngle}
                endAngle={this.endAngle}
                visible={this.athrEngaged}
                class="TransientIndicator"
              />
            </g>
            <GaugeComponent
              x={this.props.x}
              y={this.props.y}
              radius={this.radius}
              startAngle={this.startAngle}
              endAngle={this.endAngle}
              visible={Subject.create(true)}
              class="GaugeComponent Gauge"
            >
              <GaugeMarkerComponent
                value={Subject.create(0)}
                x={this.props.x}
                y={this.props.y}
                min={this.min}
                max={this.max}
                radius={this.radius}
                startAngle={this.startAngle}
                endAngle={this.endAngle}
                class="GaugeText Gauge"
                showValue
                textNudgeX={10}
                textNudgeY={-2}
                multiplierInner={0.9}
              />
              <GaugeMarkerComponent
                value={Subject.create(2.5)}
                x={this.props.x}
                y={this.props.y}
                min={this.min}
                max={this.max}
                radius={this.radius}
                startAngle={this.startAngle}
                endAngle={this.endAngle}
                class="GaugeText Gauge"
                textNudgeY={6}
                textNudgeX={13}
                multiplierInner={0.9}
              />
              <GaugeMarkerComponent
                value={Subject.create(5)}
                x={this.props.x}
                y={this.props.y}
                min={this.min}
                max={this.max}
                radius={this.radius}
                startAngle={this.startAngle}
                endAngle={this.endAngle}
                class="GaugeText Gauge"
                showValue
                textNudgeX={5}
                textNudgeY={15}
                multiplierInner={0.9}
              />
              <GaugeMarkerComponent
                value={Subject.create(7.5)}
                x={this.props.x}
                y={this.props.y}
                min={this.min}
                max={this.max}
                radius={this.radius}
                startAngle={this.startAngle}
                endAngle={this.endAngle}
                class="GaugeText Gauge"
                multiplierInner={0.9}
              />
              <GaugeMarkerComponent
                value={Subject.create(10)}
                x={this.props.x}
                y={this.props.y}
                min={this.min}
                max={this.max}
                radius={this.radius}
                startAngle={this.startAngle}
                endAngle={this.endAngle}
                class="GaugeText Gauge"
                showValue
                textNudgeY={7}
                textNudgeX={-27}
                multiplierInner={0.9}
              />
              <g visibility={this.revVisible.map((it) => (!it ? 'inherit' : 'hidden'))}>
                <rect x={this.props.x - 11} y={this.props.y + 21} width={96} height={30} class="DarkGreyBox" />
                <GaugeMarkerComponent
                  value={this.thrustPercent.map((it) => it / 10)}
                  x={this.props.x}
                  y={this.props.y}
                  min={this.min}
                  max={this.max}
                  radius={this.radius}
                  startAngle={this.startAngle}
                  endAngle={this.endAngle}
                  class="GaugeIndicator Gauge"
                  multiplierOuter={1.1}
                  indicator
                />
              </g>
            </GaugeComponent>
            <g visibility={this.revSelected.map((it) => (!it ? 'inherit' : 'hidden'))}>
              <ThrottlePositionDonutComponent
                value={this.throttleTarget.map((it) => it * 10)}
                x={this.props.x}
                y={this.props.y}
                min={this.min}
                max={this.max}
                radius={this.radius}
                startAngle={this.startAngle}
                endAngle={this.endAngle}
                class="DonutThrottleIndicator"
              />
            </g>
            <g visibility={this.revSelected.map((it) => (it ? 'inherit' : 'hidden'))}>
              <ThrottlePositionDonutComponent
                value={this.throttleTargetReverse.map((it) => this.revMax - it * 3)}
                x={this.props.x}
                y={this.props.y}
                min={this.revMin}
                max={this.revMax}
                radius={this.revRadius}
                startAngle={this.revStartAngle}
                endAngle={this.revEndAngle}
                class="DonutThrottleIndicator"
              />
            </g>
          </g>
          <g
            visibility={MappedSubject.create(
              ([active, revVisible, n1Degraded]) => active && revVisible && !n1Degraded,
              this.props.active,
              this.revVisible,
              this.props.n1Degraded,
            ).map((it) => (it ? 'inherit' : 'hidden'))}
          >
            <GaugeThrustComponent
              x={this.props.x}
              y={this.props.y}
              valueIdle={0.04}
              valueMax={2.6}
              radius={this.revRadius}
              startAngle={this.revStartAngle}
              endAngle={this.revEndAngle}
              min={this.revMin}
              max={this.revMax}
              visible={MappedSubject.create(
                ([revDeploying, revDeployed, engineState]) => revDeploying || revDeployed || engineState === 1,
                this.revDeploying,
                this.revDeploying,
                this.engineState,
              )}
              class="GaugeComponent GaugeThrustFill"
              reverse
            />
            {/* reverse */}
            <GaugeComponent
              x={this.props.x}
              y={this.props.y}
              radius={this.revRadius}
              startAngle={this.revStartAngle}
              endAngle={this.revEndAngle}
              visible={Subject.create(true)}
              class="GaugeComponent Gauge"
            >
              <AvailRev
                x={this.props.x - 18}
                y={this.props.y - 14}
                mesg={this.availRevText}
                visible={this.availRevVisible}
                revDoorOpen={this.revDeployed}
              />
              <GaugeMarkerComponent
                value={Subject.create(0)}
                x={this.props.x}
                y={this.props.y}
                min={this.revMin}
                max={this.revMax}
                radius={this.revRadius}
                startAngle={this.revStartAngle}
                endAngle={this.revEndAngle}
                class="GaugeText Gauge"
                textNudgeX={-24}
                textNudgeY={-6}
                multiplierInner={1.1}
                showValue
                overrideText="MAX"
              />
              <GaugeMarkerComponent
                value={Subject.create(this.revMax / 2)}
                x={this.props.x}
                y={this.props.y}
                min={this.revMin}
                max={this.revMax}
                radius={this.revRadius}
                startAngle={this.revStartAngle}
                endAngle={this.revEndAngle}
                class="GaugeText Gauge"
                multiplierInner={1.1}
              />
              <GaugeMarkerComponent
                value={this.thrustPercentReverse.map((thr) => this.revMax - thr * 0.03)}
                x={this.props.x}
                y={this.props.y}
                min={this.revMin}
                max={this.revMax}
                radius={this.revRadius}
                startAngle={this.revStartAngle}
                endAngle={this.revEndAngle}
                class="GaugeIndicator Gauge"
                multiplierOuter={1.1}
                indicator
              />
            </GaugeComponent>
          </g>
        </g>
      </>
    );
  }
}

interface AvailRevProps {
  x: number;
  y: number;
  mesg: Subscribable<'AVAIL' | 'REV'>;
  visible: Subscribable<boolean>;
  revDoorOpen: Subscribable<boolean>;
}

class AvailRev extends DisplayComponent<AvailRevProps> {
  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);
  }

  render() {
    return (
      <g visibility={this.props.visible.map((it) => (it ? 'inherit' : 'hidden'))}>
        <rect x={this.props.x - 28} y={this.props.y - 13} width={90} height={24} class="DarkGreyBox BackgroundFill" />
        <g visibility={this.props.mesg.map((mesg) => (mesg === 'REV' ? 'inherit' : 'hidden'))}>
          <text
            class={this.props.revDoorOpen.map((it) => `F26 Spread Centre ${it ? 'Green' : 'Amber'}`)}
            x={this.props.x - 8}
            y={this.props.y + 9}
          >
            REV
          </text>
        </g>
        <g visibility={this.props.mesg.map((mesg) => (mesg === 'AVAIL' ? 'inherit' : 'hidden'))}>
          <text class="F26 Spread Centre Green" x={this.props.x - 26} y={this.props.y + 9}>
            AVAIL
          </text>
        </g>
      </g>
    );
  }
}
