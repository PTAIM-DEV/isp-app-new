import { NextResponse } from 'next/server';

// GET /api/postal-code/search?district={name} - Search postal code by district name
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const district = searchParams.get('district');

        if (!district) {
            return NextResponse.json(
                { error: 'District name is required' },
                { status: 400 }
            );
        }

        // Call external postal code API
        const response = await fetch(
            `https://kodepos.vercel.app/search?q=${encodeURIComponent(district)}`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        // Extract unique postal codes
        const postalCodes = data.data
            ? Array.from(new Set(data.data.map((item: any) => item.postal_code)))
            : [];

        return NextResponse.json({
            postalCodes,
            source: postalCodes.length > 0 ? 'api' : 'manual',
            count: postalCodes.length,
        });
    } catch (error) {
        console.error('Error fetching postal code:', error);

        // Fallback to manual input
        return NextResponse.json({
            postalCodes: [],
            source: 'manual',
            count: 0,
            error: 'Postal code API unavailable. Please enter manually.',
        });
    }
}
