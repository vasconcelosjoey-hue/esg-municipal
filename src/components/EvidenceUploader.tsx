import React, { useState } from 'react';
import { uploadEvidence, deleteEvidence } from '../utils';

interface EvidenceUploaderProps {
    uid: string;
    questionId: string;
    comment?: string;
    currentEvidence?: {
        fileName?: string;
        fileSize?: number;
        fileUrl?: string;
        storagePath?: string;
    };
    onUploadComplete: (metadata: any) => void;
    onDelete: () => void;
}

const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({ uid, questionId, comment, currentEvidence, onUploadComplete, onDelete }) => {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploading(true);
            setProgress(30); // Simulating start

            try {
                // Determine comment to send (use existing if available)
                const { metadata } = await uploadEvidence(uid, questionId, file, comment);
                setProgress(100);
                setTimeout(() => {
                    onUploadComplete(metadata);
                    setUploading(false);
                    setProgress(0);
                }, 500);
            } catch (error: any) {
                alert(error.message);
                setUploading(false);
                setProgress(0);
                // Clear input
                e.target.value = '';
            }
        }
    };

    const handleDelete = async () => {
        if (!confirm("Tem certeza que deseja remover esta evidência?")) return;
        if (currentEvidence?.storagePath) {
            try {
                await deleteEvidence(uid, questionId, currentEvidence.storagePath);
                onDelete();
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    if (currentEvidence?.fileName) {
        return (
            <div className="bg-white border border-emerald-200 rounded-lg p-3 flex items-center justify-between shadow-sm animate-fade-in">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-lg shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate" title={currentEvidence.fileName}>{currentEvidence.fileName}</p>
                        <p className="text-xs text-slate-400">
                             {currentEvidence.fileSize ? (currentEvidence.fileSize / 1024).toFixed(1) + ' KB' : 'Arquivo'} • <span className="text-emerald-600 font-bold">✔ Evidência Anexada</span>
                        </p>
                    </div>
                </div>
                <button 
                    onClick={handleDelete}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold flex flex-col items-center"
                    title="Remover"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        );
    }

    return (
        <div className="relative group">
            <input 
                type="file" 
                id={`file-${questionId}`} 
                className="hidden" 
                accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                onChange={handleFileChange}
                disabled={uploading}
            />
            <label 
                htmlFor={`file-${questionId}`}
                className={`flex items-center justify-center gap-3 cursor-pointer p-4 rounded-xl border-2 border-dashed transition-all ${uploading ? 'bg-slate-100 border-slate-300' : 'bg-white border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/30'}`}
            >
                {uploading ? (
                    <div className="w-full flex flex-col items-center">
                         <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden mb-2">
                             <div className="h-full bg-emerald-500 transition-all duration-300" style={{width: `${progress}%`}}></div>
                         </div>
                         <p className="text-xs font-bold text-slate-500">Enviando... {progress}%</p>
                    </div>
                ) : (
                    <>
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full group-hover:bg-emerald-200 transition-colors">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-slate-700 text-sm">Clique para anexar evidência</p>
                            <p className="text-[10px] text-slate-400">PDF, Imagem, Excel (Max 1MB)</p>
                        </div>
                    </>
                )}
            </label>
        </div>
    );
};

export default EvidenceUploader;