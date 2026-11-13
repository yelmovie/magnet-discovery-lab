type Point = {x:number;y:number};
type HitPatch = Record<string,number>;
type Tone = (kind:'hit'|'finish'|'contact',hits:number)=>void;
export function normalizeVillageEncounters(value:unknown,legacy?:unknown):HitPatch;
export function mountVillageEncounters(options:{
  host:HTMLElement;stages:({x:number;y:number;name:string}|null)[];
  progress?:HitPatch;onSave:(patch:HitPatch)=>void;blocked:()=>boolean;reduced:()=>boolean;
  tone:Tone;actors:(HTMLElement|((visible:boolean)=>void)|undefined)[];
}):{update(input:{hero:Point;ally?:Point;now?:number;scale?:number;project:(point:Point)=>Point}):void;destroy():void}|null;
