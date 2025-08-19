import { IPCAction } from "../../shared/ipc-actions"
import { db } from "../db"
import { registerIpc } from "../IPC-wrapper"
import { documentsTable } from "../schema"

registerIpc(IPCAction.DOCUMENT_GETALL, async (event, filters) => {

  const documents = await db.select().from(documentsTable);
  return documents;
})