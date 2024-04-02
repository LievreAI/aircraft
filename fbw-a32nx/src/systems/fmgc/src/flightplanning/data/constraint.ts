import { AltitudeDescriptor, SpeedDescriptor } from '@flybywiresim/fbw-sdk';

// TODO at and atOrAbove do not exist in the airbus (former interpreted as atOrBelow, latter discarded)
export enum SpeedConstraintType {
    at = '@',
    atOrAbove = '+',
    atOrBelow = '-',
}

export interface AltitudeConstraint {
    /**
     * Specifies the meaning of the altitude1 and altitude2 properties
     */
    altitudeDescriptor?: AltitudeDescriptor;

    /**
     * altitudeDescriptor property specifies the meaning of this property
     */
    altitude1?: Feet;

    /**
     * altitudeDescriptor property specifies the meaning of this property
     */
    altitude2?: Feet;
}

export interface SpeedConstraint {
    speedDescriptor?: SpeedDescriptor,
    speed?: Knots,
}

export class ConstraintUtils {
    static minimumAltitude(constraint: AltitudeConstraint): Feet {
        switch (constraint?.altitudeDescriptor) {
        case AltitudeDescriptor.AtAlt1:
        case AltitudeDescriptor.AtAlt1GsIntcptAlt2:
        case AltitudeDescriptor.AtAlt1AngleAlt2:
        case AltitudeDescriptor.AtOrAboveAlt1:
        case AltitudeDescriptor.AtOrAboveAlt1GsIntcptAlt2:
        case AltitudeDescriptor.AtOrAboveAlt1AngleAlt2:
            return constraint.altitude1;
        case AltitudeDescriptor.BetweenAlt1Alt2:
            return constraint.altitude2;
        default:
            return -Infinity;
        }
    }

    static maximumAltitude(constraint: AltitudeConstraint): Feet {
        switch (constraint?.altitudeDescriptor) {
        case AltitudeDescriptor.AtAlt1:
        case AltitudeDescriptor.AtAlt1GsIntcptAlt2:
        case AltitudeDescriptor.AtAlt1AngleAlt2:
        case AltitudeDescriptor.AtOrBelowAlt1:
        case AltitudeDescriptor.AtOrBelowAlt1AngleAlt2:
        case AltitudeDescriptor.BetweenAlt1Alt2:
            return constraint.altitude1;
        default:
            return Infinity;
        }
    }
}

export enum WaypointConstraintType {
    CLB = 1,
    DES = 2,
    Unknown = 3,
}
