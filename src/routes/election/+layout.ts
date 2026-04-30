export async function load({ url }) {
    const P_Code = url.searchParams.get('location');
    return {
        P_Code,
    };
}