export type MapPoint={x:number;y:number};
export type MapTone='swing'|'hit'|'finish'|'exit'|'contact'|'appear'|'victory';
export type MapReaction={kind:'attack'|'hurt';direction:1|-1;dx:number;frame:number};
export type MapReactions={hero:MapReaction|null;ally:MapReaction|null};
export interface MapEncounterStage extends MapPoint{id:string;name:string;lines:string[];speaker?:string;prop?:string;hit?:string[];finish?:string}
export function normalizeMapHits(value:unknown,ids:readonly string[]):Record<string,number>;
export function mountMapEncounters(options:{requiredFoes?:number;activeId?:()=>string|undefined;host:HTMLElement;controls?:HTMLElement;stages:MapEncounterStage[];progress?:Record<string,number>;onSave?:(patch:Record<string,number>)=>void;blocked?:()=>boolean;reduced?:()=>boolean;art:{left:string;right?:string;frames?:number};tone?:(kind:MapTone,hits:number)=>void;palette?:string;reach?:number;contact?:number;/** True while this bubble's recorded line is being spoken: the bubble then stays until the voice is over. */speaking?:(bubble:HTMLElement)=>boolean}):{update:(input:{hero:MapPoint;ally?:MapPoint;project:(point:MapPoint)=>MapPoint;scale?:number;now?:number})=>MapReactions;destroy:()=>void};
