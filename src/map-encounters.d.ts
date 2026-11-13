export type MapPoint={x:number;y:number};
export type MapReaction={kind:'attack'|'hurt';direction:1|-1;dx:number;frame:number};
export type MapReactions={hero:MapReaction|null;ally:MapReaction|null};
export interface MapEncounterStage extends MapPoint{id:string;name:string;lines:string[];prop?:string;hit?:string[];finish?:string}
export function normalizeMapHits(value:unknown,ids:readonly string[]):Record<string,number>;
export function mountMapEncounters(options:{host:HTMLElement;controls?:HTMLElement;stages:MapEncounterStage[];progress?:Record<string,number>;onSave?:(patch:Record<string,number>)=>void;blocked?:()=>boolean;reduced?:()=>boolean;art:{left:string;right?:string;frames?:number};tone?:(kind:'hit'|'finish'|'contact',hits:number)=>void;palette?:string;reach?:number;contact?:number}):{update:(input:{hero:MapPoint;ally?:MapPoint;project:(point:MapPoint)=>MapPoint;scale?:number;now?:number})=>MapReactions;destroy:()=>void};
