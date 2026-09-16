import { SuiGrpcClient } from "@mysten/sui/grpc";
export const PACKAGE =
  "0x4358b69eb42b7fb1f11d9eb839723e3cc1f6cdb9b6528744e25c198c0da9b0c0";
export const STUDIO =
  "0xd23656ce60c4624aa91e8a1417abb34e90d1776701299e2c395c731cd1bbb42f";
export const TYPE = `${PACKAGE}::studio::TestCharacter`;
export const client = new SuiGrpcClient({
  network: "testnet",
  baseUrl: "https://fullnode.testnet.sui.io:443",
});
export const colors = ["#eee9df", "#dbeef8", "#f8e0d4", "#dfedde"];
export type Character = {
  id: string;
  name: string;
  palette: number;
  unlocked: boolean;
};
export function parseCharacter(o: {
  objectId: string;
  type?: string;
  json?: any;
}): Character {
  if (o.type !== TYPE || o.json?.studio_id !== STUDIO)
    throw new Error("This character does not belong to the test studio.");
  return {
    id: o.objectId,
    name: o.json.name,
    palette: Number(o.json.palette),
    unlocked: o.json.unlocked === true,
  };
}
export async function guard() {
  const { response } = await client.ledgerService.getServiceInfo({});
  if (response.chainId !== "69WiPg3DAQiwdxfncX6wYQ2siKwAe6L9BZthQea3JNMD")
    throw new Error("Please use the Sui test network.");
}
