import type { ReactNode } from 'react';

interface Param {
  name: string;
  type: string;
  required?: boolean;
  description: string | ReactNode;
}

interface ParamsTableProps {
  type: 'query' | 'body';
  params: Param[];
}

export function ParamsTable({ type, params }: ParamsTableProps) {
  const isBodyTable = type === 'body';
  const title = isBodyTable ? 'Request Body' : 'Query Parameters';

  return (
    <div>
      <h4 className="type-label mb-3">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full type-label">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-4 text-left type-label">Parameter</th>
              <th className="py-2 pr-4 text-left type-label">Type</th>
              {isBodyTable && <th className="py-2 pr-4 text-left type-label">Required</th>}
              <th className="py-2 text-left type-label">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            {params.map((param, idx) => (
              <tr key={param.name} className={idx === params.length - 1 ? '' : 'border-b'}>
                <td className="py-2 pr-4 font-mono type-caption">{param.name}</td>
                <td className="py-2 pr-4">{param.type}</td>
                {isBodyTable && <td className="py-2 pr-4">{param.required ? 'Yes' : 'No'}</td>}
                <td className="py-2">{param.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
