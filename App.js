import React, {useState, useEffect} from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, FlatList, Image, TextInput, Alert } from 'react-native';
import CameraFlow from './components/CameraFlow';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateReportHtml } from './utils/reportHtml';

export default function App(){
  const [flowOpen, setFlowOpen] = useState(false);
  const [vistoria, setVistoria] = useState({
    id: null,
    placa: '',
    modelo: '',
    cliente: '',
    itens: []
  });

  useEffect(()=>{
    setVistoria(v=>({ ...v, id: `vistoria_${Date.now()}`}));
  },[]);

  const startNew = ()=>{
    setVistoria({ id: `vistoria_${Date.now()}`, placa:'', modelo:'', cliente:'', itens: []});
    setFlowOpen(true);
  };
  const onSaveItem = (item) =>{
    setVistoria(v=>({ ...v, itens: [...v.itens, item]}));
  };

  const generatePdf = async () =>{
    if (vistoria.itens.length === 0){
      Alert.alert('Nada para gerar', 'Tire ao menos uma foto antes de gerar o laudo.');
      return;
    }
    const html = generateReportHtml(vistoria);
    try{
      const { uri } = await Print.printToFileAsync({ html });
      const dest = `${FileSystem.documentDirectory}${vistoria.id}.pdf`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      Alert.alert('PDF gerado', `Salvo em: ${dest}`);
      if (await Sharing.isAvailableAsync()){
        await Sharing.shareAsync(dest);
      }
    }catch(err){
      Alert.alert('Erro', String(err));
    }
  };

  return (
    <SafeAreaView style={{flex:1}}>
      {flowOpen ? (
        <CameraFlow onClose={()=>setFlowOpen(false)} onSaveItem={onSaveItem} vistoriaMeta={{placa: vistoria.placa, modelo: vistoria.modelo, cliente: vistoria.cliente}} />
      ) : (
        <View style={{flex:1, padding:16}}>
          <Text style={{fontSize:20, fontWeight:'700', marginBottom:8}}>Protótipo Vistoria (Marca d'água no canto inferior direito)</Text>

          <TextInput placeholder="Placa" value={vistoria.placa} onChangeText={t=>setVistoria(s=>({...s, placa: t}))} style={{borderWidth:1, padding:8, marginBottom:8}} />
          <TextInput placeholder="Modelo" value={vistoria.modelo} onChangeText={t=>setVistoria(s=>({...s, modelo: t}))} style={{borderWidth:1, padding:8, marginBottom:8}} />
          <TextInput placeholder="Cliente" value={vistoria.cliente} onChangeText={t=>setVistoria(s=>({...s, cliente: t}))} style={{borderWidth:1, padding:8, marginBottom:8}} />

          <TouchableOpacity onPress={startNew} style={{backgroundColor:'#0a84ff', padding:12, borderRadius:8, marginBottom:12}}>
            <Text style={{color:'#fff', textAlign:'center'}}>Iniciar Vistoria (capturar fotos)</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={generatePdf} style={{backgroundColor:'#14a44d', padding:12, borderRadius:8, marginBottom:12}}>
            <Text style={{color:'#fff', textAlign:'center'}}>Gerar PDF / Compartilhar</Text>
          </TouchableOpacity>

          <Text style={{marginTop:12, fontWeight:'600'}}>Fotos capturadas:</Text>
          <FlatList data={vistoria.itens} keyExtractor={(_,i)=>String(i)} renderItem={({item})=> (
            <View style={{flexDirection:'row', alignItems:'center', marginVertical:8}}>
              <Image source={{uri: item.file}} style={{width:100, height:70, marginRight:8}} />
              <View>
                <Text>{item.tipo} — {item.timestamp}</Text>
                {item.km ? <Text>KM: {item.km}</Text> : null}
              </View>
            </View>
          )} />

        </View>
      )}
    </SafeAreaView>
  );
}
