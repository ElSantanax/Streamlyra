import { memo, useState, useCallback } from 'react';
import { MdLink, MdContentCopy, MdRefresh, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { SidebarSection } from './SidebarSection';
import { useAuth } from '../../../../hooks';
import { authService } from '../../../../services/api/auth.service';
import { toast } from '../../../../lib/notifications';
import { dialog } from '../../../../lib/dialog/dialog.service';

export const SidebarIntegrations = memo(() => {
    const { user, login } = useAuth();
    const [showToken, setShowToken] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const overlayUrl = user?.overlayToken
        ? `${window.location.origin}/overlay/chat/${user.overlayToken}`
        : '';

    const copyToClipboard = useCallback(() => {
        if (!overlayUrl) return;
        navigator.clipboard.writeText(overlayUrl);
        toast.success('Link del chat para OBS copiado');
    }, [overlayUrl]);

    const regenerateToken = useCallback(async () => {
        if (!user) return;

        const confirmed = await dialog.warning(
            '¿Estás seguro de que quieres regenerar el token? El link actual dejará de funcionar en OBS.',
            {
                title: 'Regenerar Token',
                confirmText: 'Regenerar',
                cancelText: 'Cancelar'
            }
        );
        if (!confirmed) return;

        setIsRegenerating(true);
        try {
            const { overlayToken } = await authService.regenerateOverlayToken();
            login({ ...user, overlayToken });
            toast.success('Link de chat actualizado correctamente');
        } catch (error) {
            console.error('Error regenerating token:', error);
            toast.error('No se pudo regenerar el token');
        } finally {
            setIsRegenerating(false);
        }
    }, [user, login]);

    if (!user) return null;

    return (
        <SidebarSection title="Integraciones (OBS)">
            <div className="flex flex-col gap-3">
                <div className="bg-surface-dark border border-surface-border rounded-lg p-3 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-gray-400">
                        <MdLink size={18} className="text-primary" />
                        <span className="text-xs font-bold uppercase tracking-tight">Chat para OBS</span>
                    </div>

                    <div className="relative group">
                        <input
                            type="text"
                            readOnly
                            value={showToken ? overlayUrl : "••••••••••••••••••••••••••••••"}
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none pr-20"
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                            <button
                                onClick={() => setShowToken(!showToken)}
                                className="p-1.5 hover:bg-white/10 text-gray-400 rounded-md transition-colors"
                                title={showToken ? "Ocultar" : "Mostrar"}
                            >
                                {showToken ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}
                            </button>
                            <button
                                onClick={copyToClipboard}
                                className="p-1.5 hover:bg-white/10 text-primary rounded-md transition-colors"
                                title="Copiar link"
                            >
                                <MdContentCopy size={16} />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={regenerateToken}
                        disabled={isRegenerating}
                        className="w-full mt-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 text-gray-300 text-xs font-bold py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 border border-white/5 cursor-pointer active:scale-[0.98]"
                    >
                        <MdRefresh size={16} className={isRegenerating ? 'animate-spin' : ''} />
                        Regenerar Link
                    </button>
                </div>

                <p className="text-[10px] text-gray-500 leading-normal px-1">
                    Pega este link en una "Fuente de Navegador" en OBS. Usa fondo transparente y tamaño 500x800 para mejores resultados.
                </p>
            </div>
        </SidebarSection>
    );
});

SidebarIntegrations.displayName = 'SidebarIntegrations';
