/** Validaciones para conexiones de socket */

export const isValidUserId = (userId: unknown): userId is string => {
    if (typeof userId !== 'string') {
        return false;
    }

    if (userId.length === 0 || userId.length > 100) {
        return false;
    }

    // Validar formato UUID (v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(userId);
};
