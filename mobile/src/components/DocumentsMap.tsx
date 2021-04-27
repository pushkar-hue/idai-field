import { DrawerNavigationProp } from '@react-navigation/drawer';
import { Document } from 'idai-field-core';
import { useToast, View } from 'native-base';
import React, { ReactElement, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { update, val } from 'tsfun';
import Map from '../components/Map/Map';
import ScanBarcodeButton from '../components/ScanBarcodeButton';
import SearchBar from '../components/SearchBar';
import useSync from '../hooks/use-sync';
import { SyncSettings } from '../model/settings';
import { DocumentRepository } from '../repositories/document-repository';
import { DocumentsScreenDrawerParamList } from '../screens/DocumentsScreen';


interface DocumentsMapProps {
    repository: DocumentRepository;
    documents: Document[];
    issueSearch: (q: string) => void;
    navigation: DrawerNavigationProp<DocumentsScreenDrawerParamList, 'DocumentsMap'>;
    selectedDocument?: Document;
}


const DocumentsMap: React.FC<DocumentsMapProps> = ({
    repository,
    navigation,
    documents,
    issueSearch
}): ReactElement => {

    const [settings, setSettings, syncStatus] = useSync(repository);
    const toast = useToast();

    const toggleDrawer = useCallback(() => navigation.toggleDrawer(), [navigation]);

    const setSyncSettings = (syncSettings: SyncSettings) =>
        setSettings(oldSettings => update('sync', val(syncSettings), oldSettings));

    const onBarCodeScanned = useCallback((data: string) => {

        repository.find({ constraints: { 'identifier:match': data } })
            .then(({ documents: [doc] }) =>
                navigation.navigate('DocumentDetails', { docId: doc.resource.id })
            )
            .catch(() => toast({ title: `Resource  '${data}' not found`, position: 'center' }));
    }, [repository, navigation, toast]);
        

    return (
        <View flex={ 1 } safeArea>
            <SearchBar { ...{ issueSearch, syncSettings: settings.sync, setSyncSettings, syncStatus, toggleDrawer } } />
            <View style={ styles.container }>
                <Map geoDocuments={ documents.filter(doc => doc?.resource.geometry) } />
            </View>
            <ScanBarcodeButton onBarCodeScanned={ onBarCodeScanned } />
        </View>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    input: {
        backgroundColor: 'white',
    }
});


export default DocumentsMap;
