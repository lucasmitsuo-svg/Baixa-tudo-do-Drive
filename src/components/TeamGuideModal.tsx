import React from 'react';
import {
  BookOpen,
  CheckCircle2,
  FolderTree,
  HardDrive,
  Globe,
  Share2,
  Lock,
  Layers,
  X,
  Sparkles,
} from 'lucide-react';

interface TeamGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamGuideModal: React.FC<TeamGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/80 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Guia Prático para a Equipe</h3>
              <p className="text-xs text-slate-500">
                Como usar o sistema para baixar links e pastas do Drive mantendo tudo organizado
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs sm:text-sm text-slate-600">
          {/* Step 1 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-mono">
                1
              </span>
              <Share2 className="w-4 h-4 text-indigo-600" />
              <span>Como devem estar os links do Google Drive?</span>
            </div>
            <p className="text-slate-600 pl-8 leading-relaxed">
              O link da pasta ou do arquivo precisa estar com a permissão habilitada para a sua conta ou com a opção:{' '}
              <strong className="text-slate-800">"Qualquer pessoa com o link pode ver (Leitor)"</strong>.
              Você pode colar o link completo da barra de endereços do navegador ou do botão "Compartilhar".
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-mono">
                2
              </span>
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Colando Vários Links de Uma Só Vez</span>
            </div>
            <p className="text-slate-600 pl-8 leading-relaxed">
              Use a aba <strong className="text-slate-800">"Vários Links em Lote"</strong> para colar 2, 5, 10 ou mais links juntos (um por linha). O sistema reúne todos os arquivos de todas as pastas em uma fila única.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-mono">
                3
              </span>
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Salvar com Pastas Físicas (Recomendado para Chrome e Edge)</span>
            </div>
            <p className="text-slate-600 pl-8 leading-relaxed">
              Ao selecionar <strong className="text-emerald-700">"Criar Pastas Reais no PC"</strong>, o navegador solicitará que você escolha uma pasta destino (ex: Downloads ou sua pasta de Projetos). O app criará automaticamente cada pasta e subpasta no seu disco rígido, salvando cada arquivo no seu lugar exato!
            </p>
          </div>

          {/* Step 4 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-mono">
                4
              </span>
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Download pelo Navegador ou Pacote .ZIP</span>
            </div>
            <p className="text-slate-600 pl-8 leading-relaxed">
              Se estiver em outro navegador (Firefox, Safari) ou se preferir um único arquivo compactado, você pode escolher <strong className="text-slate-800">"Download via Navegador"</strong> ou <strong className="text-slate-800">"Pacote Compactado .ZIP"</strong> (que também preserva as pastas ao descompactar).
            </p>
          </div>

          {/* Security & Docs Notice */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-800 text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Conversão Automática de Documentos Google:</span>
            </div>
            <p className="text-xs text-slate-500">
              Google Docs são exportados automaticamente como <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-indigo-600 font-mono">.docx</code>, Planilhas como <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-emerald-600 font-mono">.xlsx</code> e Apresentações como <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-amber-600 font-mono">.pptx</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
          >
            Entendi, Vamos Começar
          </button>
        </div>
      </div>
    </div>
  );
};
