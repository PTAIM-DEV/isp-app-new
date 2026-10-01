import { logoutTechnician } from '../login/actions';

export async function POST() {
    await logoutTechnician();
}

