type CameraPoint={x:number;y:number};
export function bindMapZoom(surface:HTMLElement, options:{signal:AbortSignal;enabled:()=>boolean;onStart:()=>void;onZoom:(previous:CameraPoint,next:CameraPoint,ratio:number)=>void;ignore?:string}):void;
