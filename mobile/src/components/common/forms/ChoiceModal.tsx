import { Ionicons } from '@expo/vector-icons';
import { Field } from 'idai-field-core';
import React from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../Button';
import Card from '../Card';
import Heading from '../Heading';
import I18NLabel from '../I18NLabel';
import Row from '../Row';
import TitleBar from '../TitleBar';

interface ChoiceModalProps {
    onClose: () => void;
    choices: ItemsObject;
    field: Field
    setValue: (label: string) => void;
    type: 'checkbox'| 'radio'
}

export interface ItemsObject {
    [key: string]: ItemData;
}

interface ItemData {
    selected: boolean;
    label: string;
}

const ICON_SIZE = 24;
const ICON_COLOR = 'black';

const ChoiceModal: React.FC<ChoiceModalProps> = ({ onClose, choices, field, setValue, type }) => {

    const renderItem = ({ item }: { item: ItemData }) => (
            <Row style={ { alignItems: 'center' } } testID={ item.label }>
                <TouchableOpacity onPress={ () => setValue(item.label) } testID={ `press_${item.label}` }>
                    {type === 'checkbox' ?
                        <Ionicons
                            name={ choices[item.label].selected ? 'checkbox-outline' : 'stop-outline' }
                            size={ ICON_SIZE } color={ ICON_COLOR }
                            testID={ `icon_${item.label}` } /> :
                        <Ionicons
                            name={ choices[item.label].selected ?
                                'md-radio-button-on-outline' :
                                'md-radio-button-off-outline' }
                            size={ ICON_SIZE } color={ ICON_COLOR }
                            testID={ `icon_${item.label}` } />
                    }
                </TouchableOpacity>
                <Text style={ { marginLeft: 2 } }>{item.label}</Text>
            </Row>
    );

    return (
        <Modal onRequestClose={ onClose } animationType="fade" transparent visible={ true }>
            <View style={ styles.container }>
                <Card style={ styles.card }>
                    <TitleBar
                        title={ <Heading>
                                    <I18NLabel label={ field } />
                                </Heading> }
                        left={ <Button
                            testID="closeBtn"
                            title="Close"
                            variant="transparent"
                            icon={ <Ionicons name="close-outline" size={ 16 } /> }
                            onPress={ onClose }
                        /> }
                    />
                    <FlatList
                        data={ Object.keys(choices).map(choice => choices[choice]) }
                        keyExtractor={ item => item.label }
                        renderItem={ renderItem }
                    />
                </Card>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        marginTop: 200,
        alignItems: 'center'
    },
    card: {
        padding: 10,
        height: '60%',
        width: '60%',
        opacity: 0.9
    },
});

export default ChoiceModal;