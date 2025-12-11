import React, { useState } from 'react';
import { Evidence } from '../types';

interface Props {
  evidence: Evidence;
}

const AdminEvidenceViewer: React.FC<Props> = ({ evidence }) => {
  const [showPreview, setShowPreview] = useState(false);
  
  if (!evidence.fileUrl) return null;

  const isImage = evidence.fileType?.startsWith('image/');
  const isPDF = evidence.fileType === 'application/pdf';

  return (
    <>
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg mt-2">
         <div className="bg-white p-2 rounded border border-slate-100 shadow-sm text-xs font-bold text-slate-500 uppercase">
            {evidence.fileName?.split('.').pop()}
         </div>
         <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate">{evidence.fileName}</p>
            <p className="text-[10px] text-slate-400">{(evidence.fileSize! / 1024).toFixed(1)} KB</p>
         </div>
         <div className="flex gap-1">
             {(isImage || isPDF) && (
                 <button 
                   onClick={() => setShowPreview(true)}
                   className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                   title="Visualizar"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                 </button>
             )}
             <a 
               href={evidence.fileUrl} 
               download={evidence.fileName}
               target="_blank"
               rel="noreferrer"
               className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
               title="Baixar"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
             </a>
         </div>
      </div>

      {showPreview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-90 p-4" onClick={() => setShowPreview(false)}>
              <div className="relative w-full max-w-5xl h-[90vh] flex flex-col bg-white rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                      <h3 className="font-bold text-slate-700">{evidence.fileName}</h3>
                      <button onClick={() => setShowPreview(false)} className="text-slate-500 hover:text-red-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>
                  <div className="flex-1 bg-slate-200 overflow-auto flex items-center justify-center p-4">
                      {isImage ? (
                          <img src={evidence.fileUrl} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg" />
                      ) : (
                          <iframe src={evidence.fileUrl} className="w-full h-full border-none shadow-lg bg-white" title="PDF Preview"></iframe>
                      )}
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

export default AdminEvidenceViewer;