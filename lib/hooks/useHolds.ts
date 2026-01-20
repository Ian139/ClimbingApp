'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Hold, HoldType, HoldSize } from '@/lib/types';
import {
	addHold as addHoldUtil,
	removeHold as removeHoldUtil,
	updateHold as updateHoldUtil,
	clearHolds as clearHoldsUtil,
	toggleSequencing,
	findHoldNearPoint,
	cycleHoldType as cycleHoldTypeUtil
} from '@/lib/utils/holds';

const STORAGE_KEY = 'climbset-draft';

export function useHolds(initialHolds: Hold[] = []) {
	const [holds, setHolds] = useState<Hold[]>(() => {
		// Load from localStorage on mount
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				try {
					const parsed = JSON.parse(saved);
					// Ensure we always return an array
					return Array.isArray(parsed) ? parsed : initialHolds;
				} catch {
					return initialHolds;
				}
			}
		}
		return initialHolds;
	});
	const [selectedType, setSelectedType] = useState<HoldType>('hand');
	const [selectedSize, setSelectedSize] = useState<HoldSize>('medium');
	const [showSequence, setShowSequence] = useState(false);

	// Use refs for history to avoid stale closure issues
	const historyRef = useRef<Hold[][]>([]);
	const historyIndexRef = useRef(-1);
	const [, forceUpdate] = useState(0);

	// Save to localStorage whenever holds change
	useEffect(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(holds));
		}
	}, [holds]);

	// Helper to push to history
	const pushToHistory = useCallback((state: Hold[]) => {
		// Truncate any future history if we're not at the end
		historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
		historyRef.current.push(state);
		historyIndexRef.current = historyRef.current.length - 1;
		forceUpdate(n => n + 1);
	}, []);

	// Add hold at coordinates
	const addHold = useCallback(
		(x: number, y: number) => {
			setHolds((prev) => {
				const updated = addHoldUtil(prev, x, y, selectedType, selectedSize);
				if (updated.length !== prev.length) {
					pushToHistory(prev);
				}
				return updated;
			});
		},
		[selectedType, selectedSize, pushToHistory]
	);

	// Remove hold at coordinates
	const removeHold = useCallback(
		(x: number, y: number) => {
			setHolds((prev) => {
				const updated = removeHoldUtil(prev, x, y);
				if (updated.length !== prev.length) {
					pushToHistory(prev);
				}
				return updated;
			});
		},
		[pushToHistory]
	);

	// Tap on hold to cycle type (for mobile)
	const handleTap = useCallback(
		(x: number, y: number) => {
			setHolds((prev) => {
				const existingHold = findHoldNearPoint(prev, x, y);

				if (existingHold) {
					// Hold exists - cycle its type
					pushToHistory(prev);
					return cycleHoldTypeUtil(prev, existingHold.id);
				} else {
					// No hold - add a new one
					const updated = addHoldUtil(prev, x, y, selectedType, selectedSize);
					if (updated.length !== prev.length) {
						pushToHistory(prev);
					}
					return updated;
				}
			});
		},
		[selectedType, selectedSize, pushToHistory]
	);

	// Update a specific hold
	const updateHold = useCallback(
		(holdId: string, updates: Partial<Hold>) => {
			setHolds((prev) => {
				pushToHistory(prev);
				return updateHoldUtil(prev, holdId, updates);
			});
		},
		[pushToHistory]
	);

	// Clear all holds
	const clearHolds = useCallback(() => {
		setHolds((prev) => {
			if (prev.length > 0) {
				pushToHistory(prev);
			}
			return clearHoldsUtil();
		});
	}, [pushToHistory]);

	// Set all holds (for loading)
	const setAllHolds = useCallback((newHolds: Hold[]) => {
		setHolds(newHolds);
		historyRef.current = [];
		historyIndexRef.current = -1;
		forceUpdate(n => n + 1);
	}, []);

	// Clear draft from localStorage
	const clearDraft = useCallback(() => {
		if (typeof window !== 'undefined') {
			localStorage.removeItem(STORAGE_KEY);
		}
		setHolds([]);
		historyRef.current = [];
		historyIndexRef.current = -1;
		forceUpdate(n => n + 1);
	}, []);

	// Undo
	const undo = useCallback(() => {
		const history = historyRef.current;
		const historyIndex = historyIndexRef.current;

		if (historyIndex >= 0 && history[historyIndex] !== undefined) {
			const prevState = history[historyIndex];
			setHolds(prevState || []);
			historyIndexRef.current = historyIndex - 1;
			forceUpdate(n => n + 1);
		}
	}, []);

	// Redo
	const redo = useCallback(() => {
		const history = historyRef.current;
		const historyIndex = historyIndexRef.current;

		if (historyIndex < history.length - 1 && history[historyIndex + 1] !== undefined) {
			const nextState = history[historyIndex + 1];
			historyIndexRef.current = historyIndex + 1;
			setHolds(nextState || []);
			forceUpdate(n => n + 1);
		}
	}, []);

	// Toggle sequence visibility
	const toggleSequenceVisibility = useCallback((enable: boolean) => {
		setShowSequence(enable);
		setHolds((prev) => toggleSequencing(prev, enable));
	}, []);

	// Compute canUndo/canRedo from refs
	const canUndo = historyIndexRef.current >= 0 && historyRef.current.length > 0;
	const canRedo = historyIndexRef.current < historyRef.current.length - 1;

	return {
		holds: holds || [], // Always return an array
		selectedType,
		selectedSize,
		showSequence,
		setSelectedType,
		setSelectedSize,
		addHold,
		removeHold,
		updateHold,
		handleTap,
		clearHolds,
		setAllHolds,
		clearDraft,
		undo,
		redo,
		canUndo,
		canRedo,
		toggleSequenceVisibility
	};
}
