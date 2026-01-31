import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-config";
import { createUser, getUsersByRestaurant, updateUserRole, deactivateUser } from "@/lib/users";

// GET - List users (admin/manager only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin and manager can view users
    if (!["admin", "manager"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    const users = await getUsersByRestaurant(session.user.restaurantId);

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST - Create new user (admin/manager only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only admin and manager can create users
    if (!["admin", "manager"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "Only admins and managers can create users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["admin", "manager", "staff", "delivery"].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const user = await createUser({
      email,
      password,
      name,
      role,
      restaurantId: session.user.restaurantId,
    });

    return NextResponse.json({
      success: true,
      data: user,
      message: "User created successfully",
    });
  } catch (error: any) {
    console.error("Error creating user:", error);
    
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 }
    );
  }
}

// PATCH - Update user (admin/manager only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!["admin", "manager"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "Only admins and managers can update users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, role } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    if (role) {
      if (!["admin", "manager", "staff", "delivery"].includes(role)) {
        return NextResponse.json(
          { success: false, error: "Invalid role" },
          { status: 400 }
        );
      }
      await updateUserRole(id, role);
    }

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate user (admin/manager only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!["admin", "manager"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "Only admins and managers can deactivate users" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent self-deactivation
    if (userId === session.user.id) {
      return NextResponse.json(
        { success: false, error: "Cannot deactivate your own account" },
        { status: 400 }
      );
    }

    await deactivateUser(parseInt(userId));

    return NextResponse.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Error deactivating user:", error);
    return NextResponse.json(
      { success: false, error: "Failed to deactivate user" },
      { status: 500 }
    );
  }
}
