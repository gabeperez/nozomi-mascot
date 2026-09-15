import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { mkdir, chmod, writeFile, readFile } from 'node:fs/promises';
const dir='/Users/gabe/.config/nozomi-mascot/testnet';
await mkdir(dir,{recursive:true,mode:0o700});await chmod(dir,0o700);
const path=dir+'/wallet.key';
let key:Ed25519Keypair;
try {key=Ed25519Keypair.fromSecretKey((await readFile(path,'utf8')).trim())}catch(e:any){if(e.code!=='ENOENT')throw e;key=Ed25519Keypair.generate();await writeFile(path,key.getSecretKey()+'\n',{mode:0o600,flag:'wx'})}
const secret=decodeSuiPrivateKey(key.getSecretKey()).secretKey;
await writeFile(dir+'/sui.keystore',JSON.stringify([Buffer.concat([Buffer.from([0]),Buffer.from(secret)]).toString('base64')]),{mode:0o600});
const address=key.toSuiAddress();
await writeFile(dir+'/client.yaml',`keystore:\n  File: ${dir}/sui.keystore\nenvs:\n  - alias: testnet\n    rpc: https://fullnode.testnet.sui.io:443\n    ws: null\n    basic_auth: null\nactive_env: testnet\nactive_address: ${address}\n`,{mode:0o600});
console.log(JSON.stringify({address,network:'testnet',credentialsDirectory:dir}));
