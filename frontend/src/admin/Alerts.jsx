// frontend/src/admin/Alerts.jsx
import React from "react";
import api from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { toBR } from "@/utils/dateBR";

const useLoad=(url)=>{const [data,setData]=React.useState([]); const reload=async()=>{const r=await api.get(url); setData(r.data||[])}; React.useEffect(()=>{reload()},[url]); return {data,reload};};

export default function Alerts(){
  const alerts = useLoad("/api/commercial/alerts");
  const mark = async(id)=>{ await api.patch(`/api/commercial/alerts/${id}/read`); alerts.reload(); };

  return (
    <Card>
      <CardHeader><CardTitle>Alertas</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {alerts.data.length===0 && <div className="text-sm text-muted-foreground">Sem alertas.</div>}
        {alerts.data.map(a=>(
          <div key={a.id} className={`p-3 rounded-xl border ${a.lido?"opacity-60":""}`}>
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              <span>#{a.id} • {a.tipo} • {toBR(a.created_at)}</span>
              {!a.lido && <Button variant="outline" size="sm" onClick={()=>mark(a.id)}>Marcar como lido</Button>}
            </div>
            <pre className="mt-2 text-xs bg-muted p-2 rounded">{JSON.stringify(a.payload,null,2)}</pre>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
