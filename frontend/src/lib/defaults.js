// Default categories & seed data
import {
    Home, User, ChefHat, Zap, Droplet, Flame, Wifi, Smartphone, Wrench, Building2,
    ShoppingCart, Utensils, Fuel, ShoppingBag, Clapperboard, Sofa, MoreHorizontal,
    Shield, Stethoscope, Plane,
} from "lucide-react";

export const CATEGORY_ICONS = {
    Home, User, ChefHat, Zap, Droplet, Flame, Wifi, Smartphone, Wrench, Building2,
    ShoppingCart, Utensils, Fuel, ShoppingBag, Clapperboard, Sofa, MoreHorizontal,
    Shield, Stethoscope, Plane,
};

export const DEFAULT_CATEGORIES = [
    // Fixed
    { id: "cat-rent", name: "Rent", type: "fixed", icon: "Home" },
    { id: "cat-maid", name: "Maid", type: "fixed", icon: "User" },
    { id: "cat-cook", name: "Cook", type: "fixed", icon: "ChefHat" },
    { id: "cat-electricity", name: "Electricity", type: "fixed", icon: "Zap" },
    { id: "cat-water", name: "Water", type: "fixed", icon: "Droplet" },
    { id: "cat-gas", name: "Gas", type: "fixed", icon: "Flame" },
    { id: "cat-internet", name: "Internet", type: "fixed", icon: "Wifi" },
    { id: "cat-mobile", name: "Mobile Recharge", type: "fixed", icon: "Smartphone" },
    { id: "cat-home-maint", name: "Home Maintenance", type: "fixed", icon: "Wrench" },
    { id: "cat-society", name: "Society Maintenance", type: "fixed", icon: "Building2" },
    // Variable
    { id: "cat-groceries", name: "Groceries", type: "variable", icon: "ShoppingCart" },
    { id: "cat-dining", name: "Food & Dining", type: "variable", icon: "Utensils" },
    { id: "cat-fuel", name: "Fuel", type: "variable", icon: "Fuel" },
    { id: "cat-shopping", name: "Shopping", type: "variable", icon: "ShoppingBag" },
    { id: "cat-entertainment", name: "Entertainment", type: "variable", icon: "Clapperboard" },
    { id: "cat-home", name: "Home", type: "variable", icon: "Sofa" },
    { id: "cat-misc", name: "Miscellaneous", type: "variable", icon: "MoreHorizontal" },
    // Savings
    { id: "cat-emergency", name: "Emergency Fund", type: "savings", icon: "Shield" },
    { id: "cat-medical", name: "Medical Fund", type: "savings", icon: "Stethoscope" },
    { id: "cat-travel", name: "Travel Fund", type: "savings", icon: "Plane" },
];

export const PRIORITIES = ["Low", "Medium", "High"];
