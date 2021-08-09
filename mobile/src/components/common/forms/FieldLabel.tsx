import { Ionicons } from '@expo/vector-icons';
import { Field, I18N } from 'idai-field-core';
import React, { useContext, useState } from 'react';
import { StyleSheet, Text, TextProps, TouchableOpacity, View } from 'react-native';
import LabelsContext from '../../../contexts/labels/labels-context';
import { colors } from '../../../utils/colors';
import I18NLabel from '../I18NLabel';
import Row from '../Row';

interface FieldLabelProps extends TextProps {
    field: I18N.LabeledValue
    openModal?: () => void;
}

const ICON_SIZE = 18;

const FieldLabel: React.FC<FieldLabelProps> = (props) => {

    const { labels } = useContext(LabelsContext);
    const [infoVisible, setInfoVisible] = useState<boolean>(false);
    
    const infoBtnHandle = () => setInfoVisible(oldState => !oldState);
    const getDescription = () => labels?.getLabelAndDescription(props.field as Field).description;
    
    return (
        <View>
            <Row style={ styles.row }>
                {props.openModal &&
                    <TouchableOpacity onPress={ props.openModal } testID="fieldBtn">
                        <Ionicons name="chevron-down-circle-outline" color="black" size={ 18 } />
                    </TouchableOpacity>}
                <I18NLabel style={ props.style } label={ props.field } />
                {getDescription() && <View style={ styles.infoIcon }>
                        <TouchableOpacity onPress={ infoBtnHandle }>
                            <Ionicons name="information-circle-outline" size={ ICON_SIZE } color="black" />
                        </TouchableOpacity>
                    </View>}
            </Row>
            {infoVisible &&
                <View style={ styles.infoBox }>
                    <Text style={ styles.infoText }>{getDescription()}</Text>
                </View>
            }
        </View>);
};


const styles = StyleSheet.create({
    row: {
        backgroundColor: colors.lightgray,
        textTransform: 'capitalize',
        borderBottomColor: 'gray',
        borderBottomWidth: 1,
        paddingHorizontal: 5,
        paddingVertical: 2,
        alignItems: 'center'
    },
    infoIcon: {
        marginLeft: 'auto'
    },
    infoBox: {
        paddingVertical: 2,
        paddingHorizontal: 5,
        backgroundColor: colors.primary,
        borderBottomEndRadius: 5,
        borderBottomStartRadius: 5,
        marginHorizontal: 5
    },
    infoText: {
        color: 'white'
    }
});

export default FieldLabel;