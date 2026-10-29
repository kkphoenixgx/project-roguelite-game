// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Domain imports
import Player from '../../domain/ObjectModule/Entities/Player/Player';
import Attributes from '../../domain/ObjectModule/Entities/Attributes';
import { EventHandler } from '../../domain/eventDispacher/eventDispacher';
import ActionManager from '../../domain/eventDispacher/ActionManager';
import SimpleSword from '../../domain/ObjectModule/Items/Weapons/MeleeWeapons/SimpleSword';
import SimpleStaff from '../../domain/ObjectModule/Items/Weapons/RangedWeapons/Staffs/SimpleStaff';
import Vector2D from '../../domain/shared/Vector2D';

// Adapters and GUI imports
import ConfirmationModalGui, { ConfirmationModal } from '../../adapters/web/GUIS/confirmationModalModule/ConfirmationModalGui';
import PauseMenuGui from '../../adapters/web/GUIS/pauseMenuModule/PauseMenuGui';
import EquippedWeaponsHudGui from '../../adapters/web/GUIS/equippedWeaponsHudModule/EquippedWeaponsHudGui';
import UIManager from '../../adapters/web/components/UiManager/UIManager';
import InputGateway from '../../adapters/web/components/keyboardModule/InputGateway';
import { InputManager } from '../../adapters/web/components/keyboardModule/InputManager';
import { VisualConfigMap } from '../../adapters/web/shared/VisualConfigMap';
import { MapCanvas } from '../../adapters/assets-adapter/Components/MapCanvas';

// Tauri API mocks
const mockWindowClose = vi.fn();
const mockWindowMinimize = vi.fn();
const mockWindowToggleMaximize = vi.fn();
const mockWindowSetFullscreen = vi.fn();
const mockWindowIsFullscreen = vi.fn().mockResolvedValue(false);

vi.mock('@tauri-apps/api/window', () => ({
    getCurrentWindow: vi.fn(() => ({
        close: mockWindowClose,
        minimize: mockWindowMinimize,
        toggleMaximize: mockWindowToggleMaximize,
        setFullscreen: mockWindowSetFullscreen,
        isFullscreen: mockWindowIsFullscreen
    }))
}));

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(() => Promise.resolve())
}));

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(() => Promise.resolve(() => {}))
}));

describe('Recent Features Regression Suite', () => {
    let eventManager: EventHandler;
    let mockLogger: any;
    let player: Player;
    let actionManager: ActionManager;

    beforeEach(() => {
        vi.clearAllMocks();

        // Garante que o container do singleton ConfirmationModal permaneca no DOM
        const modal = ConfirmationModalGui.getInstance();
        if (!document.body.contains(modal['container'])) {
            document.body.appendChild(modal['container']);
        }
        modal.hide();

        eventManager = new EventHandler();
        mockLogger = { log: vi.fn() };
        player = new Player(1, { x: 100, y: 100 }, new Attributes(10, 10, 10, 10, 10, 10, 10, 10), eventManager);
        actionManager = new ActionManager(player, mockLogger, eventManager);
    });

    afterEach(() => {
        ConfirmationModalGui.getInstance().hide();
    });

    // =========================================================================
    // CASE 1: Custom Confirmation Modal (ConfirmationModal & ConfirmationModalGui)
    // =========================================================================
    describe('Case 1: Custom Confirmation Modal Component', () => {
        it('should show modal with custom title, message, variant and resolve promise on confirm', async () => {
            const modal = ConfirmationModalGui.getInstance();
            modal.hide();

            const promise = ConfirmationModal.confirm({
                title: 'Confirm Action',
                message: 'Are you sure you want to proceed?',
                confirmText: 'Yes',
                cancelText: 'No',
                variant: 'danger'
            });

            expect(modal.isOpen).toBe(true);
            const overlay = document.getElementById('confirmation-modal-overlay');
            expect(overlay?.classList.contains('is-open')).toBe(true);

            const titleEl = document.getElementById('cm-title');
            const messageEl = document.getElementById('cm-message');
            expect(titleEl?.textContent).toBe('Confirm Action');
            expect(messageEl?.textContent).toBe('Are you sure you want to proceed?');

            const btnConfirm = document.getElementById('cm-btn-confirm') as HTMLButtonElement;
            btnConfirm.click();

            const result = await promise;
            expect(result).toBe(true);
            expect(modal.isOpen).toBe(false);
            expect(overlay?.classList.contains('is-hidden')).toBe(true);
        });

        it('should resolve false when cancelled or pressing Escape', async () => {
            const modal = ConfirmationModalGui.getInstance();
            modal.hide();

            const promise = ConfirmationModal.confirm({
                title: 'Cancel Test',
                message: 'Testing cancellation'
            });

            expect(modal.isOpen).toBe(true);

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

            const result = await promise;
            expect(result).toBe(false);
            expect(modal.isOpen).toBe(false);
        });

        it('should resolve true when pressing Enter', async () => {
            const modal = ConfirmationModalGui.getInstance();
            modal.hide();

            const promise = ConfirmationModal.confirm({
                title: 'Enter Test',
                message: 'Testing Enter confirmation'
            });

            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

            const result = await promise;
            expect(result).toBe(true);
            expect(modal.isOpen).toBe(false);
        });

        it('should support alert mode with single acknowledgement button', async () => {
            const modal = ConfirmationModalGui.getInstance();
            modal.hide();

            const promise = ConfirmationModal.alert({
                title: 'Attention',
                message: 'Saved successfully',
                confirmText: 'Understood'
            });

            const btnCancel = document.getElementById('cm-btn-cancel') as HTMLElement;
            expect(btnCancel.style.display).toBe('none');

            const btnConfirm = document.getElementById('cm-btn-confirm') as HTMLButtonElement;
            btnConfirm.click();

            await promise;
            expect(modal.isOpen).toBe(false);
        });

        it('should integrate with UIManager isAnyMenuOpen and closeAnyOpenMenu', () => {
            const mockDomain: any = {
                on: vi.fn(),
                off: vi.fn(),
                getPlayerState: vi.fn(() => ({})),
                getInventory: vi.fn(() => ({ items: [] }))
            };
            const mockDialogue: any = {
                isAnyMenuOpen: vi.fn(() => false)
            };

            const uiManager = new UIManager(
                mockDomain,
                vi.fn(),
                vi.fn(),
                vi.fn(),
                vi.fn(),
                vi.fn(),
                vi.fn(),
                vi.fn(),
                mockDialogue
            );

            expect(uiManager.isAnyMenuOpen()).toBe(false);

            ConfirmationModal.confirm({ title: 'Open', message: 'Testing UI integration' });
            expect(uiManager.isAnyMenuOpen()).toBe(true);

            const closed = uiManager.closeAnyOpenMenu();
            expect(closed).toBe(true);
            expect(uiManager.isAnyMenuOpen()).toBe(false);

            uiManager.equippedWeaponsHudGui.destroy();
        });
    });

    // =========================================================================
    // CASE 2: Pause Menu Quit directly without confirmation modal
    // =========================================================================
    describe('Case 2: Pause Menu Direct Exit to Main Menu', () => {
        it('should directly call onQuit callback without triggering ConfirmationModal when clicking #pm-btn-quit', async () => {
            const confirmSpy = vi.spyOn(ConfirmationModal, 'confirm');
            const onResumeMock = vi.fn();
            const onQuitMock = vi.fn();

            const pauseMenu = new PauseMenuGui(onResumeMock, onQuitMock);
            pauseMenu.show();

            const btnQuit = document.getElementById('pm-btn-quit') as HTMLButtonElement;
            expect(btnQuit).not.toBeNull();

            btnQuit.click();
            await new Promise(r => setTimeout(r, 0));

            expect(onQuitMock).toHaveBeenCalledTimes(1);
            expect(confirmSpy).not.toHaveBeenCalled();

            document.querySelectorAll('#pause-menu-overlay').forEach(el => el.remove());
        });
    });

    // =========================================================================
    // CASE 3: Equipped Weapons HUD (EquippedWeaponsHudGui)
    // =========================================================================
    describe('Case 3: Equipped Weapons HUD Dark Souls Display', () => {
        it('should render primary and secondary weapon details and handle swap triggers', () => {
            const onSwapMock = vi.fn();
            const hud = new EquippedWeaponsHudGui(onSwapMock);

            const container = document.getElementById('equipped-weapons-hud-container');
            expect(container).not.toBeNull();

            hud.update({
                id: 1,
                entityTypeId: 'player',
                coordinates: { x: 0, y: 0 },
                size: { width: 32, height: 32 },
                rotation: 0,
                equipment: {
                    mainHand: { name: 'Death Scythe', iconId: 3, itemId: 3 },
                    secondHand: { name: 'Fire Staff', iconId: 1, itemId: 1 }
                }
            } as any);

            const primaryName = document.getElementById('ew-primary-name');
            const secondaryName = document.getElementById('ew-secondary-name');
            expect(primaryName?.textContent).toBe('Death Scythe');
            expect(secondaryName?.textContent).toBe('Fire Staff');

            // Click on TAB swap button
            const swapBtn = document.getElementById('ew-btn-swap') as HTMLElement;
            swapBtn.click();
            expect(onSwapMock).toHaveBeenCalledTimes(1);

            // Click on secondary slot (currently unselected)
            const primarySlot = document.getElementById('ew-primary-slot') as HTMLElement;
            const secSlot = document.getElementById('ew-secondary-slot') as HTMLElement;
            secSlot.click();
            expect(onSwapMock).toHaveBeenCalledTimes(2);

            // Simulate weapon swap from domain: images/names remain fixed in their slots,
            // while the selected style (.ew-slot-primary / .is-selected) moves to slot 1
            const primaryIcon = document.getElementById('ew-primary-icon') as HTMLImageElement;
            const secondaryIcon = document.getElementById('ew-secondary-icon') as HTMLImageElement;
            const initialPrimarySrc = primaryIcon.src;
            const initialSecondarySrc = secondaryIcon.src;

            hud.update({
                id: 1,
                entityTypeId: 'player',
                coordinates: { x: 0, y: 0 },
                size: { width: 32, height: 32 },
                rotation: 0,
                equipment: {
                    mainHand: { name: 'Fire Staff', iconId: 1, itemId: 1 },
                    secondHand: { name: 'Death Scythe', iconId: 3, itemId: 3 }
                }
            } as any);

            expect(primaryName?.textContent).toBe('Death Scythe');
            expect(secondaryName?.textContent).toBe('Fire Staff');
            expect(primaryIcon.src).toBe(initialPrimarySrc);
            expect(secondaryIcon.src).toBe(initialSecondarySrc);
            expect(hud.getSelectedSlotIndex()).toBe(1);
            expect(secSlot.classList.contains('ew-slot-primary')).toBe(true);
            expect(secSlot.classList.contains('is-selected')).toBe(true);
            expect(primarySlot.classList.contains('ew-slot-secondary')).toBe(true);

            hud.destroy();
        });

        it('should show unarmed state when hands are empty', () => {
            const hud = new EquippedWeaponsHudGui(vi.fn());

            hud.update({
                id: 1,
                entityTypeId: 'player',
                coordinates: { x: 0, y: 0 },
                size: { width: 32, height: 32 },
                rotation: 0,
                equipment: {
                    mainHand: null,
                    secondHand: null
                }
            } as any);

            const primaryName = document.getElementById('ew-primary-name');
            const secondaryName = document.getElementById('ew-secondary-name');
            expect(primaryName?.textContent).toBe('Desarmado');
            expect(secondaryName?.textContent).toBe('Vazio');

            const container = document.getElementById('equipped-weapons-hud-container')!;
            expect(container.querySelectorAll('.ew-card').length).toBe(2);
            expect(container.querySelectorAll('.ew-pedestal').length).toBe(2);
            expect(container.querySelector('.ew-slot-primary .ew-fillet-top')).not.toBeNull();
            expect(container.querySelector('.ew-slot-primary .ew-fillet-bottom')).not.toBeNull();

            hud.destroy();
        });
    });

    // =========================================================================
    // CASE 4: Weapon Quick Swap via TAB Key
    // =========================================================================
    describe('Case 4: Weapon Quick Swap via TAB Key', () => {
        it('should verify keymap.json maps swap_weapon to tab', () => {
            const keymapPath = path.resolve(__dirname, '../../adapters/web/assets/keymap.json');
            const keymapRaw = fs.readFileSync(keymapPath, 'utf-8');
            const keymap = JSON.parse(keymapRaw);
            expect(keymap.swap_weapon).toBe('tab');
        });

        it('should intercept Tab key in InputManager and prevent default browser focus change', () => {
            const inputManager = new InputManager();

            const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
            const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

            window.dispatchEvent(event);

            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(inputManager.isActionActive('swap_weapon')).toBe(true);
        });

        it('should translate swap_weapon to swapWeapons action in InputGateway', () => {
            const mockDomain: any = {
                handlePlayerInteractions: vi.fn()
            };
            const gateway = new InputGateway(mockDomain);

            // Simulate Tab key down
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));

            gateway.handleInteractions((x, y) => ({ x, y }));

            expect(mockDomain.handlePlayerInteractions).toHaveBeenCalledWith(
                expect.objectContaining({
                    actions: expect.arrayContaining(['swapWeapons'])
                }),
                expect.any(Object)
            );
        });

        it('should swap mainHand and secondHand on player and update active class and attack weapon', () => {
            const sword = new SimpleSword();
            const staff = new SimpleStaff();

            player.equipment.mainHand = sword;
            player.equipment.secondHand = staff;
            player.setActiveClass('Guerreiro');

            expect(player.equipment.mainHand).toBe(sword);
            expect(player.equipment.secondHand).toBe(staff);

            // Attack with sword in mainHand
            const swordAttackSpy = vi.spyOn(sword, 'attack');
            player.onLeftClickAction({ x: 200, y: 150 });
            expect(swordAttackSpy).toHaveBeenCalledTimes(1);

            // Execute quick swap via actionManager
            actionManager.checkEvent(['swapWeapons'], { x: 200, y: 150 });

            // Weapons must be inverted
            expect(player.equipment.mainHand).toBe(staff);
            expect(player.equipment.secondHand).toBe(sword);
            expect(player.activeClass).toBe('Mago');

            // Swap back to sword
            actionManager.checkEvent(['swapWeapons'], { x: 200, y: 150 });
            expect(player.equipment.mainHand).toBe(sword);
            expect(player.equipment.secondHand).toBe(staff);
            expect(player.activeClass).toBe('Guerreiro');

            // Avanca dois frames para simular soltura do clique e expirar o cooldown de ataque
            player.update(0.5);
            player.update(0.5);
            player.onLeftClickAction({ x: 200, y: 150 });
            expect(swordAttackSpy).toHaveBeenCalledTimes(2);
        });
    });

    // =========================================================================
    // CASE 5: Repositioned & Restyled Skill Cooldown HUD
    // =========================================================================
    describe('Case 5: Skill Cooldown HUD Top-Right Styling & Visibility', () => {
        it('should have container positioned at top: 48px and right: 24px', () => {
            const cssPath = path.resolve(__dirname, '../../adapters/web/GUIS/skillCooldownHudModule/skillCooldownHud.css');
            const cssContent = fs.readFileSync(cssPath, 'utf-8');

            expect(cssContent).toMatch(/#skill-cooldown-hud-container\s*\{[^}]*top:\s*48px;/);
            expect(cssContent).toMatch(/#skill-cooldown-hud-container\s*\{[^}]*right:\s*24px;/);
        });

        it('should have enlarged dimensions for cd-square, cd-icon and cd-svg', () => {
            const cssPath = path.resolve(__dirname, '../../adapters/web/GUIS/skillCooldownHudModule/skillCooldownHud.css');
            const cssContent = fs.readFileSync(cssPath, 'utf-8');

            // cd-square size: 62px
            expect(cssContent).toMatch(/\.cd-square\s*\{[^}]*width:\s*62px;/);
            expect(cssContent).toMatch(/\.cd-square\s*\{[^}]*height:\s*62px;/);

            // cd-icon size: 44px
            expect(cssContent).toMatch(/\.cd-icon\s*\{[^}]*width:\s*44px;/);
            expect(cssContent).toMatch(/\.cd-icon\s*\{[^}]*height:\s*44px;/);

            // cd-svg size: 38px
            expect(cssContent).toMatch(/\.cd-svg\s*\{[^}]*width:\s*38px;/);
            expect(cssContent).toMatch(/\.cd-svg\s*\{[^}]*height:\s*38px;/);
        });

        it('should use softened translucent clock overlay rgba(0, 0, 0, 0.48) for icon readability', () => {
            const cssPath = path.resolve(__dirname, '../../adapters/web/GUIS/skillCooldownHudModule/skillCooldownHud.css');
            const cssContent = fs.readFileSync(cssPath, 'utf-8');

            expect(cssContent).toContain('rgba(0, 0, 0, 0.48)');
        });
    });

    // =========================================================================
    // CASE 6: Dash & Dodge Roll Physics and Animation Duration
    // =========================================================================
    describe('Case 6: Dash Duration (0.30s) and Dodge Roll Animation', () => {
        it('should set dash duration to exactly 0.30s (300ms) and change state to roll', () => {
            player.direction = new Vector2D(1, 0);

            player.onShiftAction();

            expect(player.state).toBe('roll');
            expect((player as any).dashTimeRemaining).toBeCloseTo(0.30, 2);

            // Advance 0.15s (halfway)
            player.move(0.15);
            expect(player.state).toBe('roll');
            expect((player as any).dashTimeRemaining).toBeCloseTo(0.15, 2);

            // Advance remaining 0.15s
            player.move(0.15);
            expect((player as any).dashTimeRemaining).toBe(0);
            expect(player.state).toBe('walking');
        });

        it('should rotate character towards dash direction supporting 8 angles', () => {
            const diagonalDir = new Vector2D(1, 1).normalizeMut();
            player.direction = diagonalDir;

            player.onShiftAction();

            const expectedAngle = Math.atan2(diagonalDir.y, diagonalDir.x);
            expect(player.rotation).toBeCloseTo(expectedAngle, 4);
            expect(player.state).toBe('roll');
        });

        it('should have roll and dodge animations registered in VisualConfigMap with 8 frames and player-roll.png', () => {
            const playerConfig = VisualConfigMap['player'] as any;
            expect(playerConfig).toBeDefined();

            const rollAnim = playerConfig.animations['roll'];
            expect(rollAnim).toBeDefined();
            expect(rollAnim.frameCount).toBe(8);
            expect(rollAnim.imageSrc).toContain('player-roll.png');
            expect(rollAnim.spriteSize).toEqual({ width: 32, height: 32 });

            const dodgeAnim = playerConfig.animations['dodge'];
            expect(dodgeAnim).toBeDefined();
            expect(dodgeAnim.frameCount).toBe(8);
            expect(dodgeAnim.imageSrc).toContain('player-roll.png');
        });
    });

    // =========================================================================
    // CASE 7: Assets Editor F2 Hitboxes & Double-Click Hitbox Editor Integration
    // =========================================================================
    describe('Case 7: Assets Editor F2 Hitbox View & Double Click Flow', () => {
        it('should toggle showHitboxes on MapCanvas with F2 key', () => {
            const testContainer = document.createElement('div');
            testContainer.id = 'reg-canvas-container';
            document.body.appendChild(testContainer);

            const mapCanvas = new MapCanvas('reg-canvas-container', {
                id: 'vilgem',
                name: 'Vilgem',
                width: 3072,
                height: 4096,
                chunkSize: 1024,
                description: 'Test'
            });

            expect(mapCanvas.showHitboxes).toBe(false);

            // Press F2
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));
            expect(mapCanvas.showHitboxes).toBe(true);

            // Press F2 again
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2' }));
            expect(mapCanvas.showHitboxes).toBe(false);

            testContainer.remove();
        });

        it('should launch polygonWebEditor URL on double click when hitboxes are visible', () => {
            const testContainer = document.createElement('div');
            testContainer.id = 'reg-canvas-container-2';
            document.body.appendChild(testContainer);

            const mapCanvas = new MapCanvas('reg-canvas-container-2', {
                id: 'vilgem',
                name: 'Vilgem',
                width: 3072,
                height: 4096,
                chunkSize: 1024,
                description: 'Test'
            });

            const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

            mapCanvas.placedAssets = [{
                uid: 'reg_asset_1',
                presetId: 'house_red_boro',
                name: 'Casa Boro',
                x: 100,
                y: 100,
                width: 305,
                height: 354,
                imageSrc: '/assets/scenery/houses/house_red_boro_clean.png',
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                selected: false
            }];

            // When hitboxes are off: double click does nothing
            mapCanvas.showHitboxes = false;
            const openSpy = vi.spyOn(mapCanvas, 'openHitboxEditorForAsset');
            const canvasEl = (mapCanvas as any).canvas as HTMLCanvasElement;
            canvasEl.dispatchEvent(new MouseEvent('dblclick', { clientX: 150, clientY: 150 }));
            expect(openSpy).not.toHaveBeenCalled();

            // When hitboxes are on: calls openHitboxEditorForAsset and opens URL
            mapCanvas.showHitboxes = true;
            mapCanvas.openHitboxEditorForAsset(mapCanvas.placedAssets[0]!);

            expect(windowOpenSpy).toHaveBeenCalledWith(
                expect.stringContaining('/typescript/adapters/polygonWebEditor/index.html?assetId=house_red_boro'),
                '_blank'
            );

            testContainer.remove();
        });
    });

    describe('Case 8: Scenery Hitbox Alignment and 1x World Scale Bounds (Regression)', () => {
        it('should ensure house_blue_leda and all scenery assets have hitboxes strictly within 1x World Scale sprite dimensions', async () => {
            const fs = await import('fs');
            const path = await import('path');

            const catalogPath = path.resolve(process.cwd(), 'typescript/domain/ObjectModule/Scenery/asset_hitboxes.json');
            const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

            // 1. house_blue_leda specific regression check (Screenshot From 2026-10-16 21-23-27.png)
            const leda = catalog['house_blue_leda'];
            expect(leda).toBeDefined();
            expect(leda.baseWidth).toBe(260);
            expect(leda.baseHeight).toBe(327);

            for (const shape of leda.shapes) {
                if (shape.type === 'polygon') {
                    for (const pt of shape.points) {
                        expect(pt.x).toBeGreaterThanOrEqual(0);
                        expect(pt.x).toBeLessThanOrEqual(leda.baseWidth);
                        expect(pt.y).toBeGreaterThanOrEqual(0);
                        expect(pt.y).toBeLessThanOrEqual(leda.baseHeight);
                        // Regression: verify obsolete 2.8x coordinates (540, 880) are NOT present
                        expect(pt.y).not.toBe(880);
                        expect(pt.y).not.toBe(540);
                    }
                }
            }

            // 2. Global check across all assets in catalog
            for (const [assetKey, assetData] of Object.entries<any>(catalog)) {
                expect(assetData.baseWidth).toBeGreaterThan(0);
                expect(assetData.baseHeight).toBeGreaterThan(0);

                for (const shape of assetData.shapes) {
                    if (shape.type === 'polygon' && shape.points) {
                        for (const pt of shape.points) {
                            expect(pt.x).toBeGreaterThanOrEqual(0);
                            expect(pt.x).toBeLessThanOrEqual(assetData.baseWidth + 5); // small tolerance
                            expect(pt.y).toBeGreaterThanOrEqual(0);
                            expect(pt.y).toBeLessThanOrEqual(assetData.baseHeight + 5);
                        }
                    } else if (shape.type === 'circle' && shape.center) {
                        expect(shape.center.x).toBeGreaterThanOrEqual(0);
                        expect(shape.center.x).toBeLessThanOrEqual(assetData.baseWidth + 5);
                        expect(shape.center.y).toBeGreaterThanOrEqual(0);
                        expect(shape.center.y).toBeLessThanOrEqual(assetData.baseHeight + 5);
                    }
                }
            }
        });

        it('should ensure collision-layers JSON files match 1x World Scale dimensions and do not contain stale unscaled coordinates', async () => {
            const fs = await import('fs');
            const path = await import('path');

            const layerFile = path.resolve(process.cwd(), 'typescript/adapters/web/assets/scenery/collision-layers/house_blue_leda_hitboxes.json');
            expect(fs.existsSync(layerFile)).toBe(true);

            const parsed = JSON.parse(fs.readFileSync(layerFile, 'utf-8'));
            expect(parsed.hitboxes).toBeDefined();
            expect(parsed.hitboxes.length).toBeGreaterThan(0);

            for (const hb of parsed.hitboxes) {
                if (hb.type === 'polygon' && hb.points) {
                    for (const pt of hb.points) {
                        // Max sprite height is 327, must never be 880 or 540
                        expect(pt.y).toBeLessThanOrEqual(327);
                        expect(pt.x).toBeLessThanOrEqual(260);
                        expect(pt.y).not.toBe(880);
                        expect(pt.y).not.toBe(540);
                    }
                }
            }
        });
    });

    describe('Case 9: Hitbox Selection and Deletion in PolygonWebEditor (Regression)', () => {
        it('should allow selecting hitbox by clicking on its body and deleting it with Delete key', async () => {
            const { SelectTool } = await import('../../adapters/polygonWebEditor/Tools/SelectTool');
            const hitboxes = [
                {
                    id: 'poly_to_select',
                    type: 'polygon' as const,
                    coordinates: { x: 0, y: 0 },
                    rotation: 0,
                    points: [{ x: 10, y: 10 }, { x: 100, y: 10 }, { x: 100, y: 100 }, { x: 10, y: 100 }]
                }
            ];

            let selectionChanged: any = null;
            let changesSaved = 0;

            const tool = new SelectTool(
                hitboxes,
                () => { changesSaved++; },
                (selected) => { selectionChanged = selected; }
            );

            // 1. Click inside polygon body at (50, 50)
            tool.onMouseDown(new MouseEvent('mousedown', { button: 0 }), { x: 50, y: 50 }, 1);
            expect(tool.selectedHitbox).toBe(hitboxes[0]);
            expect(selectionChanged).toBe(hitboxes[0]);

            // 2. Press Delete key
            tool.onKeyDown(new KeyboardEvent('keydown', { key: 'Delete' }));
            expect(hitboxes.length).toBe(0);
            expect(tool.selectedHitbox).toBeNull();
            expect(changesSaved).toBeGreaterThan(0);
        });

        it('should allow deleting hitbox directly via right-click on the polygon body', async () => {
            const { SelectTool } = await import('../../adapters/polygonWebEditor/Tools/SelectTool');
            const hitboxes = [
                {
                    id: 'poly_rclick_target',
                    type: 'polygon' as const,
                    coordinates: { x: 0, y: 0 },
                    rotation: 0,
                    points: [{ x: 20, y: 20 }, { x: 80, y: 20 }, { x: 80, y: 80 }, { x: 20, y: 80 }]
                }
            ];

            let changesSaved = 0;
            const tool = new SelectTool(
                hitboxes,
                () => { changesSaved++; }
            );

            // Right-click inside polygon at (50, 50) with button 2
            tool.onMouseDown(new MouseEvent('mousedown', { button: 2 }), { x: 50, y: 50 }, 1);
            expect(hitboxes.length).toBe(0);
            expect(changesSaved).toBe(1);
        });
    });

    describe('Case 10: Invisible Barrier Elimination & Hitbox Display in F2 (Regression)', () => {
        it('should ensure player at (1364, 1905) can move freely and is not blocked by false AABB collision', async () => {
            const { default: DomainFacade } = await import('../../domain/DomainFacade');
            const mockLogger: any = { log: vi.fn() };
            const mockEventManager: any = { dispatch: vi.fn(), on: vi.fn(), off: vi.fn() };
            const mockCollision: any = { checkCollisions: vi.fn() };

            const domain = new DomainFacade(
                { player: { id: 1, level: 1, initialPos: { x: 1364, y: 1905 } } } as any,
                mockLogger,
                mockEventManager,
                mockCollision
            );
            await domain.loadWorld('vilgem');

            domain.player.coordinates.x = 1364;
            domain.player.coordinates.y = 1905;

            // Executa múltiplos updates físicos
            domain.update(1 / 60);
            domain.update(1 / 60);

            // O jogador não deve ser expulso nem teleportado por barreira invisível de AABB
            expect(Math.abs(domain.player.coordinates.x - 1364)).toBeLessThanOrEqual(2);
            expect(Math.abs(domain.player.coordinates.y - 1905)).toBeLessThanOrEqual(2);
        });

        it('should ensure Entity.resolveEnvironmentCollision computes exact polygon distance without blocking outside corners', async () => {
            const { default: Player } = await import('../../domain/ObjectModule/Entities/Player/Player');
            const { default: Attributes } = await import('../../domain/ObjectModule/Entities/Attributes');
            const eventListeners = new Map<string, Array<(payload: any) => void>>();
            const mockEventManager: any = {
                dispatch: vi.fn(),
                on: vi.fn((key: string, cb: any) => {
                    if (!eventListeners.has(key)) eventListeners.set(key, []);
                    eventListeners.get(key)!.push(cb);
                }),
                off: vi.fn()
            };

            const player = new Player(1, { x: 200, y: 200 }, new Attributes(10, 10, 10, 10, 10, 10, 10, 10), mockEventManager);

            // Polígono diagonal cortando um triângulo de (50, 50) a (100, 100)
            const slantedObstacle = {
                passable: false,
                coordinates: { x: 0, y: 0 },
                size: { width: 150, height: 150 },
                hitboxes: [
                    {
                        getDebugShape: () => ({
                            type: 'polygon',
                            points: [
                                { x: 50, y: 50 },
                                { x: 100, y: 50 },
                                { x: 50, y: 100 }
                            ]
                        })
                    }
                ]
            };

            // Player posicionado na coordenada (90, 90) que fica dentro do AABB [50..100, 50..100], mas FORA do triângulo
            player.coordinates.x = 90;
            player.coordinates.y = 90;

            player.resolveEnvironmentCollision(slantedObstacle, 5);

            // Coordenada deve ser preservada (sem barreira invisível no canto do AABB)
            expect(player.coordinates.x).toBe(90);
            expect(player.coordinates.y).toBe(90);
        });

        it('should ensure MapCanvas in Assets Editor renders portals, map boundary layers, and AABB envelopes when F2 is active', async () => {
            const mockCtx = {
                save: vi.fn(),
                restore: vi.fn(),
                scale: vi.fn(),
                translate: vi.fn(),
                beginPath: vi.fn(),
                arc: vi.fn(),
                moveTo: vi.fn(),
                lineTo: vi.fn(),
                closePath: vi.fn(),
                stroke: vi.fn(),
                fill: vi.fn(),
                fillRect: vi.fn(),
                strokeRect: vi.fn(),
                fillText: vi.fn(),
                measureText: vi.fn().mockReturnValue({ width: 50 }),
                setLineDash: vi.fn(),
                drawImage: vi.fn(),
                clearRect: vi.fn()
            };
            vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx as any);

            const { MapCanvas } = await import('../../adapters/assets-adapter/Components/MapCanvas');
            const mockMap: any = {
                id: 'vilgem',
                name: 'Vilgem',
                width: 3072,
                height: 4096,
                chunkSize: 1024
            };

            const container = document.createElement('div');
            container.id = 'test-canvas-container-case10';
            document.body.appendChild(container);

            const canvas = new MapCanvas('test-canvas-container-case10', mockMap);

            // 1. Configura asset com polígono e asset portal
            canvas.placedAssets = [
                {
                    uid: 'portal_test_1',
                    presetId: 'portal_link_circle',
                    name: 'Portal Test',
                    x: 1296,
                    y: 1894,
                    width: 36,
                    height: 38,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    imageSrc: '',
                    isPortal: true,
                    targetMapId: 'interior_casa_azul'
                },
                {
                    uid: 'leda_house_1',
                    presetId: 'house_blue_leda',
                    name: 'Casa Leda',
                    x: 1119,
                    y: 1612,
                    width: 260,
                    height: 327,
                    rotation: 0,
                    scaleX: 1,
                    scaleY: 1,
                    imageSrc: ''
                }
            ];

            // 2. Configura camada de colisão do mapa
            canvas.mapCollisionLayers = [
                {
                    id: 'border_test_bottom',
                    type: 'polygon',
                    coordinates: { x: 0, y: 0 },
                    points: [{ x: 0, y: 3000 }, { x: 3000, y: 3000 }, { x: 3000, y: 3050 }, { x: 0, y: 3050 }]
                }
            ];

            // Ativa visualização de Hitboxes (F2)
            canvas.toggleHitboxes();
            expect(canvas.showHitboxes).toBe(true);

            // Renderiza o frame com F2 ativo
            canvas.render();

            // Verifica que o portal é desenhado com tag identificadora
            const fillTextCalls = mockCtx.fillText.mock.calls.map((c: any[]) => c[0]);
            expect(fillTextCalls.some((txt: string) => typeof txt === 'string' && txt.includes('[Portal: interior_casa_azul]'))).toBe(true);

            // Verifica que o limite do mapa é desenhado com identificador de barreira
            expect(fillTextCalls.some((txt: string) => typeof txt === 'string' && txt.includes('[Map Boundary: border_test_bottom]'))).toBe(true);

            // Verifica que o envelope AABB de house_blue_leda foi rotulado com alerta de barreira
            expect(fillTextCalls.some((txt: string) => typeof txt === 'string' && txt.includes('⚠️ [AABB:'))).toBe(true);
        });
    });

    describe('Case 11: Adapter & GUI Performance Optimizations (Unit & Regression)', () => {
        it('should resolve item visual configs and keys in O(1) via getItemVisualByIconId and getItemVisualKeyByIconId', async () => {
            const { getItemVisualByIconId, getItemVisualKeyByIconId } = await import('../../adapters/web/shared/VisualConfigMap');

            const staffVisual = getItemVisualByIconId(1);
            expect(staffVisual).toBeDefined();
            expect(staffVisual?.iconId).toBe(1);

            const staffKey = getItemVisualKeyByIconId(1);
            expect(staffKey).toBe('staff');

            expect(getItemVisualByIconId(-999999)).toBeUndefined();
            expect(getItemVisualKeyByIconId(-999999)).toBeUndefined();
        });

        it('should preserve DOM nodes in SkillTreeGui across availablePoints changes without destroying innerHTML', async () => {
            const { default: SkillTreeGui } = await import('../../adapters/web/GUIS/skillTreeHudModule/SkillTreeGUI');
            const gui = new SkillTreeGui(() => {}, () => {});
            gui.toggle();
            const container: HTMLElement = (gui as any).container;

            const basePayload: any = {
                id: 1,
                level: 5,
                classes: [{ name: 'Mago', isUnlocked: true, isActive: true }],
                skillTree: [
                    { id: 'f1', name: 'Bola de Fogo', description: 'Fogo', tier: 1, unlocked: false, canUnlock: true, isBranchBlocked: false, type: 'active' }
                ],
                attributes: { availablePoints: 0 },
                activeLoadout: [null, null, null, null]
            };

            gui.update(basePayload);
            const nodeBefore = container.querySelector('.skill-node');
            expect(nodeBefore).not.toBeNull();
            expect(nodeBefore?.classList.contains('locked')).toBe(true);

            // Incrementa pontos de habilidade várias vezes — o elemento DOM deve ser o MESMO (atualizado in-place)
            gui.update({ ...basePayload, attributes: { availablePoints: 1 } });
            const nodeAfter1 = container.querySelector('.skill-node');
            expect(nodeAfter1).toBe(nodeBefore);
            expect(nodeAfter1?.classList.contains('can-unlock')).toBe(true);

            gui.update({ ...basePayload, attributes: { availablePoints: 5 } });
            const nodeAfter5 = container.querySelector('.skill-node');
            expect(nodeAfter5).toBe(nodeBefore);
        });

        it('should mutate GameObjectElement coordinates in-place (Zero-GC) and precompute elemental aura flags', async () => {
            const { default: GameObjectElement } = await import('../../adapters/web/components/renderModule/visuals/GameObjectElement');
            const initialState: any = {
                id: 99,
                entityTypeId: 'player',
                coordinates: { x: 10, y: 20 },
                size: { width: 32, height: 32 },
                rotation: 0,
                activeStatuses: [],
                spellElements: []
            };
            const elem = new GameObjectElement(initialState, undefined, undefined);
            const coordRef = elem.coordinates;

            elem.updateState({
                ...initialState,
                coordinates: { x: 150, y: 275 },
                activeStatuses: ['burning']
            });

            // A referência do objeto coordinates deve ser preservada (mutação in-place Zero-GC)
            expect(elem.coordinates).toBe(coordRef);
            expect(elem.coordinates.x).toBe(150);
            expect(elem.coordinates.y).toBe(275);
        });
    });

    describe('Case 12: Equipment & Amulet Persistence During Dodge Roll Without Extra Sprites (Regression)', () => {
        it('should fallback to idle sprites in VisualComposer when state is roll or dodge and preserve layer types', async () => {
            const { default: VisualComposer } = await import('../../adapters/web/components/renderModule/visuals/VisualComposer');
            const configs = new Map<string, any>();
            configs.set('player-roll', { imageSrc: 'player-roll.png', frameCount: 8, animationSpeed: 2, frameWidth: 32, frameHeight: 32 });
            configs.set('iron-helmet-idle', { imageSrc: 'helmet.png', frameCount: 1, animationSpeed: 20, frameWidth: 22, frameHeight: 16 });
            configs.set('iron-chestplate-idle', { imageSrc: 'chest.png', frameCount: 1, animationSpeed: 20, frameWidth: 18, frameHeight: 10 });
            configs.set('simple-amulet-idle', { imageSrc: 'amulet.png', frameCount: 1, animationSpeed: 20, frameWidth: 16, frameHeight: 16 });

            const layers = VisualComposer.extractLayers({
                entityTypeId: 'player',
                equipment: {
                    helmet: { iconId: 10 },
                    chestplate: { iconId: 11 },
                    amulet: { iconId: 15 }
                }
            });

            const composed = VisualComposer.compose(layers, configs, 'roll');
            expect(composed.length).toBe(4);
            expect(composed.map(c => c.type)).toEqual(['body', 'chestplate', 'amulet', 'helmet']);
        });

        it('should provide valid 8-frame anatomical socket transforms for all armor slots and amulet in PlayerRollSocketRig', async () => {
            const { getRollSocketTransform, PLAYER_ROLL_SOCKET_RIG } = await import('../../adapters/web/components/renderModule/customRenderables/PlayerRollSocketRig');
            const requiredSlots = ['helmet', 'beard', 'chestplate', 'amulet', 'gloves', 'pants', 'boots'];

            for (const slot of requiredSlots) {
                expect(PLAYER_ROLL_SOCKET_RIG[slot]?.length).toBe(8);
                for (let frame = 0; frame < 8; frame++) {
                    const transform = getRollSocketTransform(slot, frame);
                    expect(transform.cropHeightRatio).toBeGreaterThan(0);
                    expect(transform.cropHeightRatio).toBeLessThanOrEqual(1);
                }
            }

            // No Modo A (Tucked Limbs), pants e boots ficam ocultos nos frames 1..4 da bola e visíveis nos frames 0 e 5..7
            expect(getRollSocketTransform('boots', 0).alpha).toBe(1);
            expect(getRollSocketTransform('boots', 2).alpha).toBe(0);
            expect(getRollSocketTransform('boots', 6).alpha).toBe(1);
            // O capacete recorta apenas a cúpula superior nos frames 1..4 da bola
            expect(getRollSocketTransform('helmet', 2).cropHeightRatio).toBeCloseTo(0.3125, 4);
            expect(getRollSocketTransform('helmet', 0).cropHeightRatio).toBe(1);
        });
    });

    describe('Case 13: Brooches Rendered on Character Body Underneath Armor (Regression)', () => {
        it('should register all brooches from PowerSlotVisualMap as 3x3 wearable layers in RenderRegistry and sort them at zIndex 5 below armor', async () => {
            const { RenderRegistry, BROOCH_TORSO_SLOTS } = await import('../../adapters/web/shared/RenderRegistry');
            const { default: VisualComposer } = await import('../../adapters/web/components/renderModule/visuals/VisualComposer');

            // Verifica que os slots corporais de broches foram registrados no RenderRegistry com renderSize 3x3
            const healSlot0 = RenderRegistry.spriteConfigs.get('wearable-brooch-brooch_active_heal-slot-0-idle');
            expect(healSlot0).toBeDefined();
            expect(healSlot0?.frameWidth).toBe(40);
            expect(healSlot0?.frameHeight).toBe(40);
            expect(healSlot0?.renderSize).toEqual({ width: 3, height: 3 });
            expect(BROOCH_TORSO_SLOTS.length).toBeGreaterThanOrEqual(6);

            const layers = VisualComposer.extractLayers({
                entityTypeId: 'player',
                globalActiveLoadout: ['brooch_heal', 'brooch_active_meteor'],
                passiveLoadout: ['brooch_titan', 'brooch_phoenix'],
                equipment: {
                    pants: { iconId: 12 },
                    chestplate: { iconId: 11 },
                    amulet: { iconId: 15 },
                    helmet: { iconId: 10 }
                }
            });

            // Em 'idle', broches têm zIndex 5 (acima de body=0 e abaixo de pants=10, chestplate=30, amulet=32, helmet=40)
            const composedIdle = VisualComposer.compose(layers, RenderRegistry.spriteConfigs, 'idle');
            expect(composedIdle.map(c => c.type)).toEqual([
                'body',
                'brooch',
                'brooch',
                'brooch',
                'brooch',
                'pants',
                'chestplate',
                'amulet',
                'helmet'
            ]);
            expect(composedIdle[1]?.zIndex).toBe(5);

            // Em 'roll', os broches ficam ocultos enquanto as armaduras permanecem
            const composedRoll = VisualComposer.compose(layers, RenderRegistry.spriteConfigs, 'roll');
            expect(composedRoll.some(c => c.type === 'brooch')).toBe(false);
            expect(composedRoll.map(c => c.type)).toEqual(['body', 'pants', 'chestplate', 'amulet', 'helmet']);
        });
    });
});





