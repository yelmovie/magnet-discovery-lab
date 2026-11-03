import type { Activity, Point } from './domain';
import { mailbox } from './mailbox';

export const mailboxParts = [
  { id:'body', name:'우편함 몸체', button:'몸체 놓기', action:'몸체를 점선 자리에 놓아 줘', start:{x:34,y:66}, target:{x:49,y:63}, size:[520,174] },
  { id:'cover', name:'뚜껑', button:'뚜껑 연결하기', action:'뚜껑을 몸체 뒤쪽에 연결해 줘', start:{x:32,y:40}, target:{x:50.5,y:46}, size:[470,110] },
  { id:'grip', name:'손잡이', button:'손잡이 달기', action:'손잡이를 뚜껑 가운데에 달아 줘', start:{x:81,y:40}, target:mailbox.handleOpen, size:[130,66] },
  { id:'socket', name:'자석 넣는 틀', button:'자석 틀 달기', action:'자석을 넣을 틀을 뚜껑 안쪽에 달아 줘', start:{x:81,y:52}, target:mailbox.socket, size:[130,60] },
  { id:'plate', name:'철판', button:'철판 달기', action:'철판을 몸체 안쪽의 앞 테두리에 달아 줘', start:{x:81,y:64}, target:mailbox.plate, size:[110,56] },
  { id:'magnet', name:'자석', button:'자석 끼우기', action:'자석을 뚜껑 안쪽 틀에 끼워 줘', start:{x:81,y:76}, target:mailbox.socket, size:[110,56] },
] as const;
export type MailboxPart = typeof mailboxParts[number];
export const partKey=(part:MailboxPart)=>`assembly-${part.id}`;
export const partInstalled=(a:Activity,part:MailboxPart)=>a.values[partKey(part)]===true;
export const nextMailboxPart=(a:Activity)=>mailboxParts.find(part=>!partInstalled(a,part));
export const mailboxAssembled=(a:Activity)=>!nextMailboxPart(a);
export function prepareMailboxAssembly(a:Activity) {
  if(a.values.assemblyVersion===1)return;
  a.values.assemblyVersion=1;
  // Preserve already completed investigations. New and unfinished boxes start as parts.
  if(a.values.latch0===true)for(const part of mailboxParts)a.values[partKey(part)]=true;
}
export function assemblyNear(p:Point,part:MailboxPart) {
  return Math.abs(p.x-part.target.x)<7 && Math.abs(p.y-part.target.y)<6;
}
