// src/lib/api/profile.ts

export async function getProfilePicture(userId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/profile/picture/${userId}`);

    if (response.ok) {
      const data = await response.json();
      return data.url;
    }

    return null;
  } catch (error) {
    console.error('Error fetching profile picture:', error);
    return null;
  }
}

export async function uploadProfilePicture(
  userId: string,
  file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // TODO: Implement profile picture upload to storage
    return {
      success: false,
      error: 'Profile picture upload not yet implemented',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to upload profile picture',
    };
  }
}

export async function deleteProfilePicture(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement profile picture deletion from storage
    return {
      success: false,
      error: 'Profile picture deletion not yet implemented',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete profile picture',
    };
  }
}
