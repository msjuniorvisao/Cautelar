import React, {useState, useRef, useEffect} from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, Alert } from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { v4 as uuidv4 } from 'uuid';

const STEPS = [
  { key: 'dianteira', label: 'Dianteira' },
  { key: 'traseira', label: 'Traseira' },
  { key: 'lateral_esq', label: 'Lateral Esquerda' },
  { key: 'lateral_dir', label: 'Lateral Direita' },
  { key: 'motor', label: 'Motor' },
  { key: 'chassi', label: 'Chassi' },
  { key: 'odometro', label: 'Odômetro' },
  { key: 'extras', label: 'Extras' }
];

// Helper to create an SVG watermark as data URI (text rendered in small font)
// We'll overlay this SVG (semi-transparent) on the photo using ImageManipulator's 'overlay' like approach.
// Note: some ImageManipulator versions may not support 'overlay' action; if so, watermarking will still
// be applied in PDF generation as fallback (see utils/reportHtml.js).
function svgWatermark({text, width, height}){
  const fontSize = Math.max(12, Math.round(width * 0.03));
  const svg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
    <style>
      .txt { fill: rgba(255,255,255,0.9); font-family: Arial, sans-serif; font-size: ${fontSize}px }
      .bg { fill: rgba(0,0,0,0.35); }
    </style>
    <rect x='${Math.round(width*0.55)}' y='${Math.round(height*0.88)}' width='${Math.round(width*0.42)}' height='${Math.round(height*0.10)}' class='bg' rx='6' />
    <text x='${Math.round(width*0.57)}' y='${Math.round(height*0.94)}' class='txt'>${text}</text>
  </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function CameraFlow({ onClose, onSaveItem, vistoriaMeta }){
  const [hasCam, setHasCam] = useState(null);
  const [hasLoc, setHasLoc] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [km, setKm] = useState('');
  const cameraRef = useRef(null);
  const [previewUri, setPreviewUri] = useState(null);

  useEffect(()=>{
    (async ()=>{
      const cam = await Camera.requestCameraPermissionsAsync();
      setHasCam(cam.status === 'granted');
      const loc = await Location.requestForegroundPermissionsAsync();
      setHasLoc(loc.status === 'granted');
    })();
  },[]);

  const applyWatermark = async (photoUri, meta) =>{
    try{
      // load image info to know size (we'll use ImageManipulator to resize/compose)
      // We create an SVG watermark image sized to original dimensions and then use manipulateAsync to overlay it.
      const info = await ImageManipulator.manipulateAsync(photoUri, [], { compress: 1, base64: false });
      // ImageManipulator.manipulateAsync may not return width/height in all environments; fallbacks are used.
      // We'll assume a standard 2000x1500 for sizing the SVG when unknown.
      const width = info.width || 2000;
      const height = info.height || 1500;

      const text = `${meta.tipo} — ${vistoriaMeta.placa || ''} ${meta.km ? 'KM:'+meta.km : ''} ${meta.timestamp.split('T')[0]} ${meta.location ? `${meta.location.latitude.toFixed(5)},${meta.location.longitude.toFixed(5)}` : ''}`;
      const svgUri = svgWatermark({text, width, height});

      // Try to overlay SVG on top of image by using 'overlay' by composing the image and SVG via manipulateAsync's actions.
      // Some versions of ImageManipulator accept { overlay: svgUri } as an action; if not supported, we'll save the original and rely on PDF overlay fallback.
      const actions = [
        { resize: { width } },
        // The following 'overlay' action is not standard across all SDKs but included as a best-effort. If it fails, we catch and fallback.
        { overlay: svgUri }
      ];

      const result = await ImageManipulator.manipulateAsync(photoUri, actions, { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
      return result.uri;
    }catch(err){
      console.log('Watermark failed, returning original photo', err);
      return photoUri;
    }
  };

  const take = async () =>{
    if (!cameraRef.current) return;
    const snap = await cameraRef.current.takePictureAsync({quality:0.8, exif:true});
    const loc = hasLoc ? await Location.getCurrentPositionAsync({}) : null;
    const id = uuidv4();
    const tmpPath = snap.uri;
    const filename = `${FileSystem.documentDirectory}${id}.jpg`;
    await FileSystem.copyAsync({ from: tmpPath, to: filename });

    const meta = {
      id,
      tipo: STEPS[stepIndex].key,
      file: filename,
      timestamp: new Date().toISOString(),
      location: loc ? { latitude: loc.coords.latitude, longitude: loc.coords.longitude } : null,
      km: STEPS[stepIndex].key === 'odometro' ? (km || null) : null
    };

    // apply watermark (best-effort) - this may return original file if watermarking not supported
    const watermarked = await applyWatermark(filename, meta);

    const finalFile = watermarked || filename;
    // If applyWatermark returned a new uri, we can optionally delete original copy
    if (finalFile !== filename){
      try{ await FileSystem.deleteAsync(filename, { idempotent: true }); }catch(e){}
    }

    // update meta to point to final file
    meta.file = finalFile;
    onSaveItem(meta);
    setPreviewUri(finalFile);
    Alert.alert('Foto salva', `${STEPS[stepIndex].label} salva.`);
  };

  const next = ()=>{
    if (stepIndex < STEPS.length - 1) setStepIndex(i=>i+1);
    else {
      Alert.alert('Fluxo concluído', 'Você finalizou a sequência de fotos.');
      onClose();
    }
  };

  if (hasCam === null) return <View><Text>Pedindo permissões...</Text></View>;
  if (hasCam === false) return <View><Text>Permissão de câmera negada</Text></View>;

  return (
    <View style={{flex:1}}>
      <Camera style={{flex:1}} ref={cameraRef}>
        <View style={{position:'absolute', top:20, left:10}}>
          <Text style={{color:'#fff', fontWeight:'700'}}>{STEPS[stepIndex].label}</Text>
          <Text style={{color:'#fff'}}>{vistoriaMeta.placa ? `Placa: ${vistoriaMeta.placa}` : ''}</Text>
        </View>

        <View style={{position:'absolute', bottom:20, width:'100%', alignItems:'center'}}>
          {STEPS[stepIndex].key === 'odometro' && (
            <TextInput placeholder="Digite KM" value={km} onChangeText={setKm} keyboardType="numeric" style={{backgroundColor:'#fff', width:200, padding:8, marginBottom:8}} />
          )}

          <View style={{flexDirection:'row'}}>
            <TouchableOpacity onPress={take} style={{padding:12, backgroundColor:'#fff', margin:6}}>
              <Text>Capturar</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={next} style={{padding:12, backgroundColor:'#0a84ff', margin:6}}>
              <Text style={{color:'#fff'}}>Próximo</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={{padding:12, backgroundColor:'#ff3b30', margin:6}}>
              <Text style={{color:'#fff'}}>Fechar</Text>
            </TouchableOpacity>
          </View>

          {previewUri && <Image source={{uri: previewUri}} style={{width:120, height:80, marginTop:8}} />}
        </View>
      </Camera>
    </View>
  );
}
