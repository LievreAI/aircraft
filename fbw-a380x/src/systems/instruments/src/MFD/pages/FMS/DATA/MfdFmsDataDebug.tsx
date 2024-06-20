/* eslint-disable max-len */

import { ClockEvents, FSComponent, Subject, VNode } from '@microsoft/msfs-sdk';

import './MfdFmsDataStatus.scss';
import { AbstractMfdPageProps } from 'instruments/src/MFD/MFD';
import { Footer } from 'instruments/src/MFD/pages/common/Footer';

import { FmsPage } from 'instruments/src/MFD/pages/common/FmsPage';
import { MfdSimvars } from 'instruments/src/MFD/shared/MFDSimvarPublisher';
import { TopTabNavigator, TopTabNavigatorPage } from 'instruments/src/MFD/pages/common/TopTabNavigator';

interface MfdFmsDataDebugProps extends AbstractMfdPageProps {}
export class MfdFmsDataDebug extends FmsPage<MfdFmsDataDebugProps> {
  private selectedPageIndex = Subject.create<number>(0);

  private tab1lineLabels = [
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
  ];

  private tab1lineValues = [
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
    Subject.create<string>(''),
  ];

  protected onNewData() {
    this.tab1lineLabels[0].set('CLB SPEED LIMIT');
    this.tab1lineValues[0].set(
      `${this.props.fmcService.master?.fmgc.getClimbSpeedLimit().speed.toFixed(2)} U${this.props.fmcService.master?.fmgc.getClimbSpeedLimit().underAltitude.toFixed(0)}` ??
        '',
    );

    this.tab1lineLabels[1].set('MANAGED CLB SPEED');
    this.tab1lineValues[1].set(this.props.fmcService.master?.fmgc.getManagedClimbSpeed().toFixed(2) ?? '');

    this.tab1lineLabels[2].set('MANAGED CLB MACH');
    this.tab1lineValues[2].set(this.props.fmcService.master?.fmgc.getManagedClimbSpeedMach().toFixed(2) ?? '');

    this.tab1lineLabels[3].set('PRESEL CLB SPEED');
    this.tab1lineValues[3].set(this.props.fmcService.master?.fmgc.getPreSelectedClbSpeed().toFixed(2) ?? '');

    this.tab1lineLabels[4].set('MANAGED CRZ SPEED');
    this.tab1lineValues[4].set(this.props.fmcService.master?.fmgc.getManagedCruiseSpeed().toFixed(2) ?? '');

    this.tab1lineLabels[5].set('MANAGED CRZ MACH');
    this.tab1lineValues[5].set(this.props.fmcService.master?.fmgc.getManagedCruiseSpeedMach().toFixed(2) ?? '');

    this.tab1lineLabels[6].set('PRESEL CRZ SPEED');
    this.tab1lineValues[6].set(this.props.fmcService.master?.fmgc.getPreSelectedCruiseSpeed().toFixed(2) ?? '');

    this.tab1lineLabels[7].set('MANAGED DES SPEED');
    this.tab1lineValues[7].set(this.props.fmcService.master?.fmgc.getManagedDescentSpeed().toFixed(2) ?? '');

    this.tab1lineLabels[8].set('MANAGED DES MACH');
    this.tab1lineValues[8].set(this.props.fmcService.master?.fmgc.getManagedDescentSpeedMach().toFixed(2) ?? '');

    this.tab1lineLabels[9].set('PRESEL DES SPEED');
    this.tab1lineValues[9].set(this.props.fmcService.master?.fmgc.getPreSelectedDescentSpeed().toFixed(2) ?? '');

    this.tab1lineLabels[10].set('');
    this.tab1lineValues[10].set('');

    this.tab1lineLabels[11].set('A32NX_SPEEDS_VLS');
    this.tab1lineValues[11].set((SimVar.GetSimVarValue('L:A32NX_SPEEDS_VLS', 'number') as number).toFixed(2) ?? '');

    this.tab1lineLabels[12].set('A32NX_SPEEDS_MANAGED_PFD');
    this.tab1lineValues[12].set(
      (SimVar.GetSimVarValue('L:A32NX_SPEEDS_MANAGED_PFD', 'number') as number).toFixed(2) ?? '',
    );

    this.tab1lineLabels[13].set('A32NX_SPEEDS_MANAGED_ATHR');
    this.tab1lineValues[13].set(
      (SimVar.GetSimVarValue('L:A32NX_SPEEDS_MANAGED_ATHR', 'number') as number).toFixed(2) ?? '',
    );

    this.tab1lineLabels[14].set('A32NX_PFD_LOWER_SPEED_MARGIN');
    this.tab1lineValues[14].set(
      (SimVar.GetSimVarValue('L:A32NX_PFD_LOWER_SPEED_MARGIN', 'number') as number).toFixed(2) ?? '',
    );

    this.tab1lineLabels[15].set('A32NX_PFD_UPPER_SPEED_MARGIN');
    this.tab1lineValues[15].set(
      (SimVar.GetSimVarValue('L:A32NX_PFD_UPPER_SPEED_MARGIN', 'number') as number).toFixed(2) ?? '',
    );
  }

  public onAfterRender(node: VNode): void {
    super.onAfterRender(node);

    const sub = this.props.bus.getSubscriber<ClockEvents & MfdSimvars>();
    this.subs.push(
      sub
        .on('realTime')
        .atFrequency(2)
        .handle((_t) => {
          this.onNewData();
        }),
    );
  }

  render(): VNode {
    return (
      <>
        {super.render()}
        {/* begin page content */}
        <div class="mfd-page-container">
          <TopTabNavigator
            pageTitles={Subject.create(['FMGC', 'N/A'])}
            selectedPageIndex={this.selectedPageIndex}
            pageChangeCallback={(val) => this.selectedPageIndex.set(val)}
            selectedTabTextColor="white"
            tabBarSlantedEdgeAngle={25}
          >
            <TopTabNavigatorPage>
              {/* FMGC */}
              {this.tab1lineLabels.map((_, idx) => (
                <div style="margin-bottom: 10px;">
                  <span class="mfd-label" style="margin-right: 25px;">
                    {this.tab1lineLabels[idx]}
                  </span>
                  <span class="mfd-value bigger">{this.tab1lineValues[idx]}</span>
                </div>
              ))}
            </TopTabNavigatorPage>
            <TopTabNavigatorPage>{/* N/A */}</TopTabNavigatorPage>
          </TopTabNavigator>
          <div style="flex-grow: 1;" />
          {/* fill space vertically */}
        </div>
        <Footer bus={this.props.bus} mfd={this.props.mfd} fmcService={this.props.fmcService} />
      </>
    );
  }
}
