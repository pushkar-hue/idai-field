import { Position } from 'geojson';
import React from 'react';
import { CommonPathProps, Path } from 'react-native-svg';
import { multiLineStringToPath } from '../geojson-path/geojson-svg-path';
import { GeoElementsCommonProps } from './common-props';

interface GeoMultiLineStringProps extends CommonPathProps, GeoElementsCommonProps {}

export const GeoMultiLineString: React.FC<GeoMultiLineStringProps> = (props) => {
    return (
        <Path
            { ...props }
            fill="none"
            strokeWidth={ 1 }
            vectorEffect="non-scaling-stroke"
            d={ multiLineStringToPath(props.coordinates as Position[][]) } />
    );
};